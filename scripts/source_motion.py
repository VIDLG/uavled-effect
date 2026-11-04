"""Source-constrained image motion: generated anchors, fixed coordinates, RGB transitions."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import uuid

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path("assets/effects/generated-keyframe-experiments/source-motion-v1")
OLD = Path("assets/effects/generated-keyframe-experiments/flare-dense16")
WIDTH, HEIGHT = 768, 512


def save_image(image, path, **kwargs):
    """Complete image writes before replacing a previously exported artifact."""
    path = Path(path)
    temporary = path.with_name(f".{path.stem}-{uuid.uuid4().hex}{path.suffix}")
    try:
        image.save(temporary, **kwargs)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def sample_source(frames, seconds, fps):
    position = float(np.clip(seconds * fps, 0, len(frames) - 1))
    left = int(position)
    amount = position - left
    return frames[left] * (1 - amount) + frames[min(left + 1, len(frames) - 1)] * amount


def phase_coordinate(led_index, source_frame):
    # Snapshot zero already executed tick(), hence source_frame + 1.
    return (4 * (source_frame + 1) + 42 * led_index) % 512


def replace_regions(base, target, mask):
    return np.clip(np.round(base * (1 - mask[..., None]) + target * mask[..., None]), 0, 255).astype(np.uint8)


def display_exposure(rgb, gain=1.8):
    # Source snapshots already include runtime master brightness. Restore image exposure without clipping hue ratios.
    maximum = np.maximum(rgb.max(axis=-1, keepdims=True), 1)
    return rgb * np.minimum(gain, 255/maximum)


def smoothstep(low, high, value):
    x = np.clip((value - low) / (high - low), 0, 1)
    return x * x * (3 - 2 * x)


def resample_path(points, count):
    points = np.asarray(points, dtype=np.float32)
    lengths = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]
    samples = np.linspace(0, lengths[-1], count)
    return np.stack([np.interp(samples, lengths, points[:, axis]) for axis in (0, 1)], axis=-1)


def geometry(style):
    # Image-space calibration against the saved Flare artwork, not simulator viewport coordinates.
    if style == "styleCyberpunk":
        upper = [[176, 98], [163, 117], [153, 135], [148, 155], [151, 176], [157, 196], [169, 217], [181, 237], [183, 248]]
        lower = [[181, 258], [173, 278], [159, 300], [150, 321], [148, 343], [151, 365], [160, 387], [175, 406], [193, 422]]
    else:
        upper = [[171, 105], [161, 123], [155, 143], [154, 165], [159, 186], [167, 207], [177, 227], [184, 246]]
        lower = [[185, 258], [175, 280], [163, 301], [155, 323], [154, 345], [159, 369], [168, 391], [181, 410], [198, 423]]
    left = np.vstack([resample_path(upper, 20), resample_path(lower, 20)])
    right = left.copy()
    right[:, 0] = WIDTH - right[:, 0]
    return left, right


class MotionField:
    def __init__(self, style, frames, base=None, paths=None):
        self.style = style
        self.frames = np.asarray(frames, dtype=np.float32)
        self.base = np.asarray(Image.open(OLD / "frames" / f"{style}-000.png").convert("RGB")) if base is None else np.asarray(base)
        self.left, self.right = geometry(style) if paths is None else paths
        self.y, self.x = np.mgrid[:HEIGHT, :WIDTH].astype(np.float32)
        self.distance = np.full((HEIGHT, WIDTH), np.inf, np.float32)
        self.coordinate = np.zeros((HEIGHT, WIDTH), np.float32)
        for points in (self.left, self.right):
            for i, (a, b) in enumerate(zip(points[:-1], points[1:])):
                delta = b - a
                fraction = np.clip(((self.x-a[0])*delta[0] + (self.y-a[1])*delta[1]) / np.dot(delta, delta), 0, 1)
                distance = np.hypot(self.x-a[0]-fraction*delta[0], self.y-a[1]-fraction*delta[1])
                use = distance < self.distance
                self.coordinate[use] = (i + fraction)[use]
                self.distance[use] = distance[use]

        # At physical LED cores keep the exact logical value; subpixel projection must not leak a neighbor's state.
        for points in (self.left, self.right):
            for i, (x, y) in enumerate(points):
                self.coordinate[(self.x-x)**2+(self.y-y)**2 <= 2**2] = i

        vertices = np.vstack([self.left, self.right, [[220, 31], [548, 31], [339, 43], [429, 43], [308, 435], [460, 435]]]).astype(np.int32)
        inside = np.zeros((HEIGHT, WIDTH), np.uint8)
        cv2.fillConvexPoly(inside, cv2.convexHull(vertices), 255)
        hsv = cv2.cvtColor(self.base, cv2.COLOR_RGB2HSV).astype(np.float32)
        self.value = hsv[..., 2] / 255
        saturation = hsv[..., 1] / 255
        # Max RGB alone flattens saturated glow and white emitter cores to the same brightness.
        # Preserve the original low-saturation bright cores above their colored halos.
        gain = 4.0 if style == "styleMatrix" else 1.2
        self.band_texture = np.clip(self.value * (1-.72*saturation) * gain, .025, 1)
        colored = smoothstep(.08, .3, saturation)
        # Include low-saturation light cores next to a color region, while protecting neutral drone areas.
        colored = cv2.dilate(colored, np.ones((3, 3), np.uint8))
        # Protect actual neutral material, not a bounding polygon (which would leave a static green cutout).
        material_protection = np.where(inside > 0, smoothstep(.30, .52, saturation), 1)
        self.background_mask = colored * material_protection
        self.band_mask = np.maximum((1-smoothstep(4, 13, self.distance)) * colored,
                                    1-smoothstep(3, 5, self.distance))
        self.mask = np.maximum(self.background_mask, self.band_mask)
        self.births = np.full((len(self.frames), 40), -10000, np.float32)
        for n in range(len(self.frames)):
            if n:
                self.births[n] = self.births[n-1]
            active = self.frames[n, :, 1] > 0
            previous = self.frames[n-1, :, 1] > 0 if n else np.zeros(40, bool)
            self.births[n, active & ~previous] = n

    @staticmethod
    def at_coordinate(colors, coordinate):
        low = np.floor(coordinate).astype(np.int32)
        amount = (coordinate-low)[..., None]
        return colors[low] * (1-amount) + colors[np.minimum(low+1, 39)] * amount

    def render(self, seconds, detail=None, colors=None):
        source_position = float(np.clip(seconds*30, 0, len(self.frames)-1))
        colors = sample_source(self.frames, seconds, 30) if colors is None else colors
        band = self.at_coordinate(colors, self.coordinate)
        if self.style == "styleCyberpunk":
            diagonal = ((self.x + self.y) / 17 + 3) % 39
            bg_colors = self.at_coordinate(colors, diagonal)
            phase = phase_coordinate(diagonal, source_position)
            front = (.5+.5*np.cos(phase*np.pi/128))**6
            bg_target = bg_colors * self.value[..., None] * (.60 + .55*front[..., None])
            band_target = band * self.band_texture[..., None]
        else:
            column = np.floor(self.x/22).astype(np.int32) % 40
            age = (source_position-self.births[int(source_position), column]) / 30
            head_y = (column*53 % 340)-50 + age*130
            delta = self.y-head_y
            head = np.exp(-delta**2/(2*19**2))
            tail = np.exp(np.minimum(delta, 0)/75) * (delta < 0)
            activity = colors[column, 1] / 255
            envelope = .08 + (.1 + .7*head + .25*tail)*activity
            bg_target = np.array([0, 255, 30], np.float32)*self.value[..., None]*envelope[..., None]
            band_target = band * self.band_texture[..., None]
        if detail is not None:
            bg_target *= detail[..., None]
            band_target *= detail[..., None]
        bg_target = display_exposure(bg_target)
        band_target = display_exposure(band_target)
        output = replace_regions(self.base, bg_target, self.background_mask)
        # Full replacement at the band core; interpolation only at the feathered spatial boundary.
        return replace_regions(output, band_target, self.band_mask)


def prepare(root):
    source = json.loads((root / "source-frames.json").read_text())
    for folder in ("controls", "prompts", "raw", "keyframes"):
        (root / folder).mkdir(exist_ok=True)
    calibration = {}
    for style, frames in source["styles"].items():
        field = MotionField(style, frames)
        calibration[style] = {"left": field.left.tolist(), "right": field.right.tolist(), "logicalIndices": list(range(40))}
        save_image(Image.fromarray((field.mask*255).astype(np.uint8)), root / f"{style}-color-mask.png")
        # Index labels are for debugging calibration only, never supplied as the art target.
        guide = Image.fromarray(field.base.copy())
        draw = ImageDraw.Draw(guide)
        for side in (field.left, field.right):
            for i, (x, y) in enumerate(side):
                draw.ellipse((x-2, y-2, x+2, y+2), fill="yellow")
                if i % 5 == 0:
                    draw.text((x+5, y), str(i), fill="white")
        save_image(guide, root / "controls" / f"{style}-calibration.png")
        for batch in range(2):
            indices = source["keyframes"][batch*4:batch*4+4]
            grid = Image.new("RGB", (1536, 1024))
            for slot, index in enumerate(indices):
                grid.paste(Image.fromarray(field.render(index/30)), ((slot%2)*WIDTH, (slot//2)*HEIGHT))
            save_image(grid, root / "controls" / f"{style}-{batch:02}.png")
            positions = [round(-i*4/42, 3) for i in indices]
            prompt = f"""Edit the FIRST image: an exact 2x2 animation storyboard of four equal 768x512 panels, no gutters or labels. Return 1536x1024. The second image is the same-series artwork identity reference.
These are four DIFFERENT MOTION POSITIONS, not four brightness variations. Reading order source frames {indices} at 30fps, so the time interval is 0.533333 seconds. The first image ALREADY contains correctly calibrated LED locations, colors and spatial phase. Preserve those locations and states panel by panel. Refine only local luminous texture, tiny glow and light-head detail. No change to hue grouping, no re-positioning the color boundaries to the same place in all panels.
Lock drone silhouette, four dense guard grills, propellers, body, camera, size and viewpoint. Preserve exact surrounding scenery geometry. Motion belongs to the colored light segments and background light heads, NOT the drone, NOT the camera, NOT geometric rails. No neutral-body brightness flicker. Preserve this album-art style; do not redesign as a 3D product render. No text, arrows, numbers, logos or watermarks.
"""
            if style == "styleCyberpunk":
                prompt += f"Cyberpunk spatial positions: relative to frame zero, the SAME magenta/cyan phase boundary advances toward SMALLER LED indices by {positions} logical LEDs. Adjacent panels differ by 1.524 LEDs. Along BOTH mirrored S-shaped outer paths: toward the top, not oscillating top/bottom. Diagonal background luminous fronts also advance consistently toward upper-left, on fixed diagonal rails. Pink and cyan remain separate moving sections, no random hue swapping, no back-and-forth. Follow the first image's color boundaries exactly."
            else:
                prompt += "Matrix: the first image encodes different SOURCE-ACTIVE green LED POSITIONS in every panel; inactive points must remain dim. Existing points decay in place; new points light at other indices. Do not turn the entire strip solid green and do not invent an LED chase. Background digital-rain bright heads are at progressively LOWER positions in each column, with an upward fading tail; new heads can spawn independently. Follow the explicit reference positions instead of changing global exposure."
            (root / "prompts" / f"{style}-{batch:02}.txt").write_text(prompt+"\n", encoding="utf-8")
    (root / "calibration.json").write_text(json.dumps(calibration, indent=2)+"\n")
    print("Prepared four source-position storyboard targets and exact edit prompts.")


def align_generated(image, field, background_only=False):
    region = np.zeros((HEIGHT, WIDTH), np.uint8)
    region[45:435, 160:610] = 255
    region[field.mask > .01] = 0
    detector = cv2.ORB_create(nfeatures=2400, fastThreshold=12)
    key_a, desc_a = detector.detectAndCompute(cv2.cvtColor(image, cv2.COLOR_RGB2GRAY), region)
    key_b, desc_b = detector.detectAndCompute(cv2.cvtColor(field.base, cv2.COLOR_RGB2GRAY), region)
    if desc_a is None or desc_b is None:
        raise ValueError("Generated frame has no recognizable neutral drone features")
    pairs = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(desc_a, desc_b, k=2)
    matches = [a for pair in pairs if len(pair) == 2 for a, b in [pair] if a.distance < .72*b.distance]
    if len(matches) < 12:
        raise ValueError("Generated frame drifted away from the reference drone")
    p = np.float32([key_a[m.queryIdx].pt for m in matches])
    q = np.float32([key_b[m.trainIdx].pt for m in matches])
    transform, inliers = cv2.estimateAffinePartial2D(p, q, method=cv2.RANSAC, ransacReprojThreshold=2)
    if transform is None or inliers.sum() < 12:
        raise ValueError("Generated frame cannot be reliably aligned")
    scale = np.hypot(transform[0, 0], transform[1, 0])
    low,high,translation=(.85,1.15,60) if background_only else (.94,1.06,24)
    if not low < scale < high or abs(transform[:, 2]).max() > translation:
        raise ValueError(f"Generated frame moved the drone too much: {transform.tolist()}")
    return cv2.warpAffine(image, transform, (WIDTH, HEIGHT), borderMode=cv2.BORDER_REFLECT_101), {
        "transform": transform.tolist(), "inliers": int(inliers.sum())}


def moving_detail(field, details, keyframes, seconds):
    position = float(np.clip(seconds*30, 0, keyframes[-1]))
    left = min(len(keyframes)-2, int(np.searchsorted(keyframes, position, side="right"))-1)
    left = max(0, left)
    amount = (position-keyframes[left])/(keyframes[left+1]-keyframes[left])
    # Advect generated luminous detail along a known direction; never estimate direction from AI image differences.
    vx, vy = (-30*4/42*17/2, -30*4/42*17/2) if field.style == "styleCyberpunk" else (0, 130)
    a_time = (position-keyframes[left])/30
    b_time = (position-keyframes[left+1])/30
    a = cv2.remap(details[left], field.x-vx*a_time, field.y-vy*a_time, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    b = cv2.remap(details[left+1], field.x-vx*b_time, field.y-vy*b_time, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    moving = a*(1-amount)+b*amount
    # Actual LED carriers do not move: interpolate their luminous texture at a fixed physical coordinate.
    stationary = details[left]*(1-amount)+details[left+1]*amount
    return moving*(1-field.band_mask)+stationary*field.band_mask


def export(root):
    source = json.loads((root / "source-frames.json").read_text())
    keyframes = source["keyframes"]
    (root / "generated").mkdir(exist_ok=True)
    (root / "keyframes").mkdir(exist_ok=True)
    report = {}
    for style, frames in source["styles"].items():
        field = MotionField(style, frames)
        details, alignments = [], []
        for batch in range(2):
            with Image.open(root / "raw" / f"{style}-{batch:02}.png") as grid:
                if grid.size != (1536, 1024):
                    raise ValueError(f"Unexpected contact sheet size: {grid.size}")
                for slot in range(4):
                    index = keyframes[batch*4+slot]
                    x, y = (slot%2)*WIDTH, (slot//2)*HEIGHT
                    raw = np.asarray(grid.convert("RGB").crop((x, y, x+WIDTH, y+HEIGHT))).copy()
                    save_image(Image.fromarray(raw), root / "generated" / f"{style}-{index:03}.png")
                    registered, stats = align_generated(raw, field)
                    target = field.render(index/30)
                    # Retain generated luminous microstructure, while source color/position remain authoritative.
                    ratio = (registered.max(axis=2).astype(np.float32)+8)/(target.max(axis=2).astype(np.float32)+8)
                    ratio = cv2.GaussianBlur(np.clip(ratio, .75, 1.35), (5, 5), .8)
                    details.append(ratio)
                    alignments.append({"sourceFrame": index, **stats})

        contact = Image.new("RGB", (1536, 552), (16, 20, 24))
        for n, index in enumerate(keyframes):
            anchor = field.render(index/30, details[n])
            save_image(Image.fromarray(anchor), root / "keyframes" / f"{style}-{index:03}.png")
            thumb = Image.fromarray(anchor).resize((384, 256), Image.Resampling.LANCZOS)
            x, y = (n%4)*384, (n//4)*276
            contact.paste(thumb, (x, y+20))
            ImageDraw.Draw(contact).text((x+8, y+4), f"source {index:03} | {index/30:.3f}s", fill="white")
        save_image(contact, root / f"{style}-keyframes.jpg", quality=94)

        render_count = keyframes[-1]*2
        video_path = root / f"{style}-motion60.mp4"
        temporary_video = root / f".{style}-{uuid.uuid4().hex}.mp4"
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                   "-s", f"{WIDTH}x{HEIGHT}", "-r", "60", "-i", "-", "-an", "-c:v", "libx264", "-crf", "18",
                   "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(temporary_video)]
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
        gif_frames, spacetime, max_neutral_error = [], [], 0
        render_error = None
        try:
            for n in range(render_count):
                seconds = n/60
                detail = moving_detail(field, details, keyframes, seconds)
                frame = field.render(seconds, detail)
                error = np.abs(frame[field.mask == 0].astype(int)-field.base[field.mask == 0].astype(int)).max()
                max_neutral_error = max(max_neutral_error, int(error))
                if error:
                    raise AssertionError("Neutral image region changed")
                encoder.stdin.write(frame.tobytes())
                if n % 2 == 0:
                    gif_frames.append(Image.fromarray(frame).resize((576, 384), Image.Resampling.LANCZOS))
                points = np.round(field.left).astype(int)
                spacetime.append(frame[points[:, 1], points[:, 0]])
                if n % 60 == 0:
                    print(f"{style}: rendered {n}/{render_count} frames", flush=True)
        except BaseException as error:
            render_error = error
        finally:
            encoder.stdin.close()
            code = encoder.wait()
        if render_error is not None or code:
            temporary_video.unlink(missing_ok=True)
            if render_error is not None:
                raise render_error
            raise RuntimeError(f"FFmpeg failed with code {code}")
        temporary_video.replace(video_path)

        palette_sheet = Image.new("RGB", (576*8, 384))
        for i in range(8):
            palette_sheet.paste(gif_frames[round(i*(len(gif_frames)-1)/7)], (i*576, 0))
        palette = palette_sheet.quantize(colors=256)
        gif = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in gif_frames]
        durations = [round((n+1)*100/30)*10-round(n*100/30)*10 for n in range(len(gif))]
        save_image(gif[0], root / f"{style}-motion30.gif", save_all=True, append_images=gif[1:], duration=durations, loop=0, disposal=2)

        # A fixed physical LED index on each row exposes direction reversals and color-position mismatch.
        actual = np.stack(spacetime, axis=1)
        expected = np.stack([sample_source(field.frames, n/60, 30) for n in range(render_count)], axis=1)
        evidence = Image.new("RGB", (896, 376), (16, 20, 24))
        d = ImageDraw.Draw(evidence)
        d.text((8, 8), "Rendered LED path: index 0 at top, 39 at bottom; time moves right", fill="white")
        evidence.paste(Image.fromarray(actual).resize((896, 160), Image.Resampling.NEAREST), (0, 28))
        d.text((8, 196), "Actual source RGB at the same indices and times", fill="white")
        evidence.paste(Image.fromarray(expected.astype(np.uint8)).resize((896, 160), Image.Resampling.NEAREST), (0, 216))
        save_image(evidence, root / f"{style}-space-time.png")

        norm_a = actual.astype(np.float32)/np.maximum(actual.max(axis=2, keepdims=True), 1)
        norm_b = expected/np.maximum(expected.max(axis=2, keepdims=True), 1)
        active = expected.max(axis=2) > 10
        report[style] = {
            "generatedKeyframes": 8, "sourceIndices": keyframes, "sourceFrames": len(frames),
            "renderFrames": render_count, "renderFps": 60, "durationSeconds": render_count/60,
            "gifFps": 30, "maxNeutralPixelDifference": max_neutral_error,
            "meanNormalizedColorErrorAtLedCenters": float(np.abs(norm_a-norm_b)[active].mean()),
            "alignment": alignments,
        }
    manifest = {
        "model": "gpt-image-2.5-flare", "operation": "images.edit", "size": "1536x1024", "quality": "high",
        "sourceFps": 30, "renderFps": 60, "keyframeSourceIndices": keyframes,
        "inputAuthority": "source RGB and calibrated image-space positions",
        "neutralMaterial": "fixed reference pixels",
        "interpolation": "forward-only source RGB interpolation; generated detail advected along known background directions",
        "cyberpunkDisplacementPerSourceFrame": -4/42,
        "matrixMotion": "LED birth/decay at fixed indices; background heads move down at 130px/s after source trigger",
        "generatedDetailGainRange": [.75, 1.35],
        "displayExposure": {"gain": 1.8, "gamutLimit": "scale all channels together", "preserveEmitterCores": True},
        "preludeSha256": source["preludeSha256"], "requests": [],
    }
    for style in source["styles"]:
        for batch in range(2):
            relative = f"raw/{style}-{batch:02}.png"
            manifest["requests"].append({
                "sourceIndices": keyframes[batch*4:batch*4+4],
                "images": [f"request-controls/{style}-{batch:02}.png", f"../flare-dense16/frames/{style}-000.png"],
                "prompt": f"prompts/{style}-{batch:02}.txt", "output": relative,
                "outputSha256": hashlib.sha256((root / relative).read_bytes()).hexdigest(),
            })
            request = manifest["requests"][-1]
            request["inputSha256"] = [hashlib.sha256((root / path).read_bytes()).hexdigest() for path in request["images"]]
    (root / "verification.json").write_text(json.dumps(report, indent=2)+"\n")
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
    print(json.dumps({style: {k: v for k, v in stats.items() if k != "alignment"} for style, stats in report.items()}, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["prepare", "export"])
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    if args.mode == "prepare":
        prepare(args.root)
    else:
        export(args.root)


if __name__ == "__main__":
    main()
