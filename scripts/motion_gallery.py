"""Generate source-position storyboards and export lightweight, forward-looping albums."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import uuid

import cv2
import numpy as np
from PIL import Image, ImageDraw
from source_motion import (MotionField, sample_source, smoothstep, resample_path,
                           replace_regions, display_exposure, save_image, align_generated)
from album_background import REVISION, TARGETS, backdrop

ROOT = Path("assets/effects/generated-motion-gallery")
PREVIOUS = Path("assets/effects/generated-keyframe-experiments/source-motion-v1")
WIDTH, HEIGHT = 768, 512


def loop_colors(frames, seconds, period=256, closure=12):
    position = (seconds*30) % period
    colors = sample_source(frames, position/30, 30)
    weight = smoothstep(period-closure, period, position)
    return colors*(1-weight) + frames[0]*weight


def detail_segment(keys, position):
    period = keys[-1] + keys[1]-keys[0]
    position %= period
    left = min(len(keys)-1, max(0, int(np.searchsorted(keys, position, side="right"))-1))
    right = (left+1) % len(keys)
    start, end = keys[left], keys[right] if right else period
    return left, right, (position-start)/(end-start), start, end


def album_paths(style):
    if style == "styleForest":
        upper = [[176, 106], [164, 123], [155, 147], [157, 171], [166, 197], [179, 224], [184, 246]]
        lower = [[177, 258], [166, 280], [156, 305], [154, 331], [161, 358], [165, 389], [176, 420]]
    elif style == "styleOcean":
        upper = [[172, 107], [160, 125], [151, 148], [151, 171], [158, 195], [166, 218], [168, 241]]
        lower = [[173, 255], [160, 280], [150, 306], [148, 333], [153, 361], [164, 389], [178, 423]]
    else:
        upper = [[165, 107], [152, 127], [144, 149], [144, 174], [150, 198], [159, 219], [160, 241]]
        lower = [[165, 255], [151, 282], [142, 309], [140, 338], [145, 368], [159, 400], [175, 433]]
    left = np.vstack([resample_path(upper, 20), resample_path(lower, 20)])
    right = left.copy()
    right[:, 0] = WIDTH-right[:, 0]
    return left, right


class AlbumField(MotionField):
    def __init__(self, definition, frames, revised=True):
        self.definition = definition
        self.revised = bool(revised and definition['id'] in TARGETS and (REVISION/'bases'/f"{definition['id']}.png").exists())
        if definition.get("existing"):
            super().__init__(definition["id"], frames)
        else:
            image = Image.open(f"assets/effects/generated-details/{definition['id']}-detail.png").convert("RGB")
            base = np.asarray(image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS))
            current = np.asarray(Image.open(REVISION/'bases'/f"{definition['id']}.png").convert('RGB')) if self.revised else base
            super().__init__(definition["id"], frames, base=current, paths=album_paths(definition["id"]))
            if self.revised:
                # Preserve the old physical emitter texture/exposure exactly; the revision is in the scene.
                hsv = cv2.cvtColor(base, cv2.COLOR_RGB2HSV).astype(np.float32)
                self.band_texture = np.clip(hsv[..., 2]/255*(1-.72*hsv[..., 1]/255)*1.2, .025, 1)
                self.background_mask = np.asarray(Image.open(REVISION/'masks'/f"{definition['id']}.png").convert('L'), np.float32)/255
                self.mask = np.maximum(self.background_mask, self.band_mask)
        self.angle = np.arctan2(self.y-HEIGHT/2, self.x-WIDTH/2)
        self.radius = np.hypot(self.x-WIDTH/2, self.y-HEIGHT/2)
        if self.revised:
            self.background_phase = 2*np.pi*((self.x/WIDTH*1.7+self.y/HEIGHT*.8) if self.style == 'styleOcean' else (self.x/WIDTH*1.2-self.y/HEIGHT*.15))
            self.scene = self.base.astype(np.float32)

    def render(self, seconds, detail=None, colors=None):
        if self.definition.get("existing"):
            return super().render(seconds, detail, colors)
        colors = sample_source(self.frames, seconds, 30) if colors is None else colors
        if self.revised:
            background = backdrop(self.scene, self.distance, self.background_phase, seconds, detail)
            band = self.at_coordinate(colors, self.coordinate)*self.band_texture[..., None]
            if detail is not None:
                band *= detail[..., None]
            exposure = 3.2 if self.style == 'styleAurora' else 2.2
            output = replace_regions(self.base, background, self.background_mask)
            return replace_regions(output, display_exposure(band, exposure), self.band_mask)
        if self.style == "styleForest":
            coordinate = (self.angle*40/(2*np.pi) + self.radius/110 + 20) % 39
        elif self.style == "styleOcean":
            coordinate = (self.angle*40/(2*np.pi) - self.radius/90 + 12) % 39
        else:
            coordinate = (self.x/WIDTH*39 + np.sin(self.y/90)) % 39
        background = self.at_coordinate(colors, coordinate)*self.value[..., None]*1.35
        band = self.at_coordinate(colors, self.coordinate)*self.band_texture[..., None]
        if detail is not None:
            background *= detail[..., None]
            band *= detail[..., None]
        exposure = 3.2 if self.style == "styleAurora" else 2.2
        output = replace_regions(self.base, display_exposure(background, exposure), self.background_mask)
        return replace_regions(output, display_exposure(band, exposure), self.band_mask)


def advect(field, detail, seconds):
    if field.style in ("styleForest", "styleOcean"):
        speed = -30*(3/32 if field.style == "styleForest" else 3/30)*2*np.pi/40
        theta = field.angle-speed*seconds
        x = WIDTH/2 + field.radius*np.cos(theta)
        y = HEIGHT/2 + field.radius*np.sin(theta)
    else:
        vx, vy = {
            "styleCyberpunk": (-30*4/42*17/2, -30*4/42*17/2),
            "styleMatrix": (0, 130), "styleAurora": (-30*2/28*WIDTH/39, 0),
        }[field.style]
        x, y = field.x-vx*seconds, field.y-vy*seconds
    return cv2.remap(detail, x.astype(np.float32), y.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)


def loop_detail(field, details, keys, seconds):
    period = keys[-1]+keys[1]-keys[0]
    position = (seconds*30) % period
    a, b, amount, start, end = detail_segment(keys, position)
    moving = advect(field, details[a], (position-start)/30)*(1-amount) + advect(field, details[b], (position-end)/30)*amount
    fixed = details[a]*(1-amount)+details[b]*amount
    return moving*(1-field.band_mask)+fixed*field.band_mask


def render_loop(field, details, keys, seconds):
    seconds %= 256/30
    colors = loop_colors(field.frames, seconds)
    detail = loop_detail(field, details, keys, seconds)
    frame = field.render(seconds, detail, colors)
    # Random Matrix birth histories do not repeat every 256 frames. Close their
    # background head state as well as RGB; this is a display-only loop join.
    if field.style == "styleMatrix" and seconds*30 > 244:
        weight = smoothstep(244, 256, seconds*30)
        start = field.render(0, loop_detail(field, details, keys, 0), loop_colors(field.frames, 0))
        frame = np.round(frame*(1-weight)+start*weight).astype(np.uint8)
    return frame


def prepare(root):
    data = json.loads((root/"source-frames.json").read_text(encoding="utf-8"))
    for folder in ("controls", "prompts", "raw", "references", "posters", "keyframes"):
        (root/folder).mkdir(exist_ok=True)
    calibration = {}
    for definition in data["definitions"]:
        style = definition["id"]
        field = AlbumField(definition, data["styles"][style], revised=False)
        calibration[style] = {"left": field.left.tolist(), "right": field.right.tolist()}
        if definition.get("existing"):
            continue
        save_image(Image.fromarray(field.base), root/"references"/f"{style}.png")
        guide = Image.fromarray(field.base.copy())
        draw = ImageDraw.Draw(guide)
        for path in (field.left, field.right):
            for i, (x, y) in enumerate(path):
                draw.ellipse((x-2, y-2, x+2, y+2), fill="yellow")
                if i % 5 == 0:
                    draw.text((x+5, y), str(i), fill="white")
        save_image(guide, root/"controls"/f"{style}-calibration.jpg", quality=92)
        for batch in range(2):
            indices = definition["keyframes"][batch*4:batch*4+4]
            grid = Image.new("RGB", (1536, 1024))
            for slot, index in enumerate(indices):
                grid.paste(Image.fromarray(field.render(index/30)), ((slot%2)*WIDTH, (slot//2)*HEIGHT))
            save_image(grid, root/"controls"/f"{style}-{batch:02}.png")
            prompt = f"""Edit image 1, a precisely positioned 2x2 light-animation storyboard. Output one 1536x1024 image, four equal 768x512 panels, no gaps, borders or text. Image 2 fixes the original series identity and exact drone geometry.
Reading order source frames {indices} at 30fps, 1.066667 seconds between panels. These are DIFFERENT forward motion positions, NOT variations of the same pose or whole-image brightness. Source behavior: {definition['rules']}.
Image 1 already places the moving colors and bright points at their intended locations. Preserve each panel's specific LED states, light-region locations and palette. Refine luminous microtexture, tiny glow and coherent background light heads. The SAME bright crest must advance toward lower logical LED indices across panels, on BOTH mirrored outer S-shaped strips. Light carriers themselves remain fixed. No arbitrary back-and-forth or resetting a crest to its earlier position.
Lock the exact four dense guard grills, propellers, central body, camera, silhouette, scale, position and viewpoint. Keep the existing scenery geometry and same album-art finish. Motion belongs to light sections and luminous background fronts, not the drone, camera, leaves, coast geometry or stars. Keep neutral material exposure fixed. No new LED paths, no closed rings, no text, numbers, arrows, logos, watermark or photorealistic product redesign.
Background motion: {('green canopy fronts and yellow-green firefly highlights travel consistently along the existing curved light paths; foliage stays fixed' if style == 'styleForest' else 'blue-cyan wave crests progress along the existing curved water-light paths; small highlights follow the same direction' if style == 'styleOcean' else 'magenta-purple luminous curtain fronts progress leftward across the existing light sheets; use actual native-JavaScript RGB even though the function comment describes green/cyan; source RGB takes precedence over the identity reference palette')}.
"""
            (root/"prompts"/f"{style}-{batch:02}.txt").write_text(prompt, encoding="utf-8")
    (root/"calibration.json").write_text(json.dumps(calibration, indent=2)+"\n")
    print("Prepared source-position controls and prompts for Forest, Ocean and Aurora.")


def export(root, styles=None):
    data = json.loads((root/"source-frames.json").read_text(encoding="utf-8"))
    catalog = {effect['id']: effect for effect in json.loads((root/'index.json').read_text(encoding='utf-8'))['effects']} if (root/'index.json').exists() else {}
    verification = json.loads((root/'verification.json').read_text(encoding='utf-8')) if (root/'verification.json').exists() else {}
    requests = []
    for definition in data["definitions"]:
        style, keys = definition["id"], definition["keyframes"]
        if styles and style not in styles:
            continue
        field = AlbumField(definition, data["styles"][style])
        raw_root = REVISION/'raw' if field.revised else PREVIOUS/"raw" if definition.get("existing") else root/"raw"
        details, alignments = [], []
        for batch in range(2):
            raw_path = raw_root/f"{style}-{batch:02}.png"
            with Image.open(raw_path) as grid:
                assert grid.size == (1536, 1024), grid.size
                for slot in range(4):
                    x, y = (slot%2)*WIDTH, (slot//2)*HEIGHT
                    raw = np.asarray(grid.convert("RGB").crop((x, y, x+WIDTH, y+HEIGHT))).copy()
                    registered, stats = align_generated(raw, field)
                    index = keys[batch*4+slot]
                    target = field.render(index/30)
                    ratio = (registered.max(axis=2).astype(np.float32)+8)/(target.max(axis=2).astype(np.float32)+8)
                    details.append(cv2.GaussianBlur(np.clip(ratio, .75, 1.35), (5, 5), .8))
                    alignments.append({"sourceFrame": index, **stats})
            if not definition.get("existing"):
                prefix = f'{REVISION.name}/' if field.revised else ''
                inputs = [f"{prefix}controls/{style}-{batch:02}.png", f"{prefix}bases/{style}.png" if field.revised else f"references/{style}.png"]
                requests.append({"style": style, "sourceFrames": keys[batch*4:batch*4+4],
                    "images": inputs, "inputSha256": [hashlib.sha256((root/p).read_bytes()).hexdigest() for p in inputs],
                    "prompt": f"{prefix}prompts/{style}-{batch:02}.txt", "output": f"{prefix}raw/{style}-{batch:02}.png",
                    "outputSha256": hashlib.sha256(raw_path.read_bytes()).hexdigest()})

        first = render_loop(field, details, keys, 0)
        endpoint = render_loop(field, details, keys, 256/30)
        assert np.array_equal(first, endpoint), f"Loop endpoint mismatch: {style}"
        save_image(Image.fromarray(first), root/"posters"/f"{style}.jpg", quality=92)
        contact = Image.new("RGB", (1536, 552), (17, 22, 23))
        thumbnails = []
        for n, index in enumerate(keys):
            anchor = render_loop(field, details, keys, index/30)
            path = f"keyframes/{style}-{index:03}.jpg"
            save_image(Image.fromarray(anchor).resize((384, 256), Image.Resampling.LANCZOS), root/path, quality=90)
            thumbnails.append({"time": index/30, "image": path, "sourceFrame": index})
            x, y = (n%4)*384, (n//4)*276
            contact.paste(Image.open(root/path), (x, y+20))
            ImageDraw.Draw(contact).text((x+8, y+4), f"{index/30:.2f}s | source {index:03}", fill="white")
        save_image(contact, root/f"{style}-keyframes.jpg", quality=92)

        output = root/f"{style}-background-v2-loop.mp4" if field.revised else root/f"{style}-loop.mp4"
        temporary = root/f".{style}-{uuid.uuid4().hex}.mp4"
        encoder = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", "768x512", "-r", "60", "-i", "-", "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(temporary)], stdin=subprocess.PIPE)
        neutral_error, adjacent, trace = 0, [], []
        previous, last, error = None, None, None
        points = np.round(field.left).astype(int)
        try:
            for n in range(512):
                frame = render_loop(field, details, keys, n/60)
                neutral_error = max(neutral_error, int(np.abs(frame[field.mask == 0].astype(int)-field.base[field.mask == 0].astype(int)).max()))
                if previous is not None:
                    adjacent.append(float(np.abs(frame.astype(np.float32)-previous).mean()))
                previous, last = frame.astype(np.float32), frame
                trace.append(frame[points[:, 1], points[:, 0]])
                encoder.stdin.write(frame.tobytes())
                if n % 128 == 0:
                    print(f"{style}: {n}/512 loop frames", flush=True)
        except BaseException as exc:
            error = exc
        finally:
            encoder.stdin.close()
            code = encoder.wait()
        if error is not None or code:
            temporary.unlink(missing_ok=True)
            if error is not None:
                raise error
            raise RuntimeError(f"FFmpeg exit {code}")
        temporary.replace(output)
        assert neutral_error == 0
        seam = float(np.abs(last.astype(np.float32)-first).mean())
        verification[style] = {"generatedKeyframes": 8, "sourceFrames": 257, "renderFrames": 512, "fps": 60,
            "duration": 256/30, "closureSourceFrames": 12, "neutralMaxDifference": neutral_error,
            "endpointMaxDifference": int(np.abs(endpoint.astype(int)-first.astype(int)).max()),
            "lastToFirstRgbMAE": seam, "meanAdjacentRgbMAE": float(np.mean(adjacent)), "alignment": alignments}
        save_image(Image.fromarray(np.stack(trace, axis=1)).resize((1024, 160), Image.Resampling.NEAREST), root/f"{style}-space-time.png")
        catalog[style] = {k: definition[k] for k in ("id", "label", "description", "palette")}
        catalog[style].update({"video": output.name, "poster": f"posters/{style}.jpg", "duration": 256/30,
                           "fps": 60, "keyframes": thumbnails})
        if field.revised:
            catalog[style]['revision'] = REVISION.name
        print(f"{style}: closed-loop seam MAE={seam:.4f}, neutral error={neutral_error}", flush=True)

    (root/"index.json").write_text(json.dumps({"effects": [catalog[d['id']] for d in data['definitions']]}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    (root/"verification.json").write_text(json.dumps(verification, indent=2)+"\n", encoding="utf-8")
    generation = {"model": "gpt-image-2.5-flare", "operation": "images.edit",
        "size": "1536x1024", "quality": "high", "sourceSha256": data["preludeSha256"],
        "requests": requests, "reusedGeneratedKeyframes": str(PREVIOUS),
        "loopClosure": "Forward playback, last 12 source frames blend RGB to first state; generated detail wraps forward, never ping-pong",
        "sourceNote": "Aurora native-JavaScript ledHsv fractional branch yields magenta, unlike its comment; no source functions modified"}
    if any((REVISION/'bases'/f'{style}.png').exists() for style in TARGETS):
        revision_requests = [request for request in requests if request['prompt'].startswith(REVISION.name+'/')]
        if revision_requests:
            revised_generation = {**generation, 'requests': revision_requests, 'backgroundRequests': [],
                'requestsRoot': root.as_posix(), 'backgroundRequestsRoot': REVISION.as_posix()}
            for style in TARGETS:
                raw = REVISION/'background-raw'/f'{style}.png'
                revised_generation['backgroundRequests'].append({'style': style, 'image': f'references/{style}.png',
                    'inputSha256': hashlib.sha256((REVISION/'references'/f'{style}.png').read_bytes()).hexdigest(),
                    'prompt': f'background-prompts/{style}.txt', 'output': f'background-raw/{style}.png',
                    'outputSha256': hashlib.sha256(raw.read_bytes()).hexdigest()})
            (REVISION/'generation.json').write_text(json.dumps(revised_generation, indent=2)+'\n', encoding='utf-8')
        generation = json.loads((root/'generation.json').read_text(encoding='utf-8'))
        generation['backgroundRevision'] = {'effects': list(TARGETS), 'manifest': f'{REVISION.name}/generation.json',
                                           'rules': f'{REVISION.name}/rules.json'}
    (root/"generation.json").write_text(json.dumps(generation, indent=2)+'\n', encoding='utf-8')
    print("Saved the five-effect browser catalog and verification records.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("prepare", "export"))
    parser.add_argument('--styles', nargs='+', choices=('styleCyberpunk', 'styleMatrix', 'styleForest', 'styleOcean', 'styleAurora'))
    args = parser.parse_args()
    if args.mode == "prepare":
        prepare(ROOT)
    else:
        export(ROOT, args.styles)


if __name__ == "__main__":
    main()
