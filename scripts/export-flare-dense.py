"""Align generated keyframes, freeze the inner drone, and export honest 15fps previews."""
import json
import hashlib
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/effects/generated-keyframe-experiments/flare-dense16")
(root / "frames").mkdir(exist_ok=True)
source = json.loads((root / "source-frames.json").read_text(encoding="utf-8"))
report = {}


def freeze_mask():
    """Inner guards/body only; leave the outer light strips and background free."""
    y, x = np.mgrid[:512, :768].astype(np.float32)
    mask = np.zeros((512, 768), np.uint8)
    for cx, cy in ((250, 163), (518, 163), (250, 331), (518, 331)):
        mask[((x-cx)/87)**2 + ((y-cy)/85)**2 < 1] = 255
    mask[(x >= 328) & (x <= 440) & (y >= 51) & (y <= 424)] = 255
    return cv2.GaussianBlur(mask, (11, 11), 2).astype(np.float32) / 255


def align(frame, anchor):
    hsv = cv2.cvtColor(anchor, cv2.COLOR_RGB2HSV)
    region = np.zeros((512, 768), np.uint8)
    region[40:430, 150:620] = 255
    region[hsv[:, :, 1] > 70] = 0
    detector = cv2.ORB_create(nfeatures=2200, fastThreshold=12)
    left, ld = detector.detectAndCompute(cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY), region)
    right, rd = detector.detectAndCompute(cv2.cvtColor(anchor, cv2.COLOR_RGB2GRAY), region)
    if ld is None or rd is None:
        raise ValueError("No neutral-drone features to align")
    pairs = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(ld, rd, k=2)
    matches = [a for pair in pairs if len(pair) == 2 for a, b in [pair] if a.distance < 0.72*b.distance]
    if len(matches) < 12:
        raise ValueError(f"Insufficient alignment matches: {len(matches)}")
    p = np.float32([left[m.queryIdx].pt for m in matches])
    q = np.float32([right[m.trainIdx].pt for m in matches])
    transform, inliers = cv2.estimateAffinePartial2D(p, q, method=cv2.RANSAC, ransacReprojThreshold=2)
    if transform is None or int(inliers.sum()) < 12:
        raise ValueError("Unreliable neutral-drone alignment")
    scale = float(np.hypot(transform[0, 0], transform[1, 0]))
    if not 0.94 <= scale <= 1.06 or np.max(np.abs(transform[:, 2])) > 22:
        raise ValueError(f"Unexpected pose drift: {transform.tolist()}")
    return cv2.warpAffine(frame, transform, (768, 512), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101), {
        "inliers": int(inliers.sum()), "transform": transform.tolist()
    }


for style in ("styleCyberpunk", "styleMatrix"):
    originals = []
    for group in range(4):
        with Image.open(root / "raw" / f"{style}-{group:02}.png") as grid:
            assert grid.size == (1536, 1024), grid.size
            for n in range(4):
                x, y = (n % 2)*768, (n // 2)*512
                originals.append(np.asarray(grid.convert("RGB").crop((x, y, x+768, y+512))).copy())
    anchor = originals[0]
    mask = freeze_mask()
    Image.fromarray((mask*255).astype(np.uint8)).save(root / f"{style}-freeze-mask.png")
    frames, alignment = [], []
    for n, original in enumerate(originals):
        registered, stats = align(original, anchor)
        stable = np.round(registered * (1-mask[:, :, None]) + anchor*mask[:, :, None]).astype(np.uint8)
        frame = Image.fromarray(stable)
        frame.save(root / "frames" / f"{style}-{n:03}.png")
        frames.append(frame)
        stats["sourceFrame"] = n * 2
        stats["frozenCoreMaxDifference"] = int(np.abs(stable[mask > 0.999].astype(int) - anchor[mask > 0.999].astype(int)).max())
        assert stats["frozenCoreMaxDifference"] == 0
        alignment.append(stats)

    palette_sheet = Image.new("RGB", (768*4, 512*4))
    for n, frame in enumerate(frames):
        palette_sheet.paste(frame, ((n % 4)*768, (n // 4)*512))
    palette_sheet.resize((1536, 1024)).save(root / f"{style}-contact-sheet.jpg", quality=92)
    palette = palette_sheet.resize((768, 512)).quantize(colors=256)
    gif_frames = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    # 15 fps is approximated with centisecond GIF durations, total 1.07s.
    durations = [round((n+1)*100/15)*10-round(n*100/15)*10 for n in range(16)]
    gif_frames[0].save(root / f"{style}-dense15.gif", save_all=True, append_images=gif_frames[1:],
                       duration=durations, loop=0, disposal=2)

    # Apples-to-apples: same new frames and postprocessing, different temporal sampling.
    compare_frames = []
    for n, frame in enumerate(frames):
        image = Image.new("RGB", (1536, 552), (16, 23, 27))
        d = ImageDraw.Draw(image)
        d.text((18, 12), "4 keyframes / 3.75 unique fps", fill="white")
        d.text((786, 12), "16 keyframes / 15 unique fps", fill="white")
        image.paste(frames[(n // 4)*4], (0, 40))
        image.paste(frame, (768, 40))
        compare_frames.append(image)
    compare_sheet = Image.new("RGB", (1536, 552*16))
    for n, frame in enumerate(compare_frames):
        compare_sheet.paste(frame, (0, n*552))
    compare_palette = compare_sheet.resize((768, 4416)).quantize(colors=256)
    compare_gif = [f.quantize(palette=compare_palette, dither=Image.Dither.NONE) for f in compare_frames]
    compare_gif[0].save(root / f"{style}-density-comparison.gif", save_all=True, append_images=compare_gif[1:],
                         duration=durations, loop=0, disposal=2)
    # Temporary comparison PNGs belong in tmp, not the reusable asset directory.
    temp = Path("tmp/flare-dense-export")
    temp.mkdir(parents=True, exist_ok=True)
    for n, image in enumerate(compare_frames):
        image.save(temp / f"{style}-compare-{n:03}.png")

    arr = [np.asarray(f, dtype=np.float32) for f in frames]
    fine = [float(np.abs(arr[i+1]-arr[i]).mean()) for i in range(15)]
    coarse = [float(np.abs(arr[i+4]-arr[i]).mean()) for i in (0, 4, 8)]
    report[style] = {
        "generatedKeyframes": 16, "uniqueFps": 15, "resolution": [768, 512],
        "adjacentRgbMAE": fine, "coarseEightSourceFrameRgbMAE": coarse,
        "meanAdjacentRgbMAE": float(np.mean(fine)), "meanCoarseRgbMAE": float(np.mean(coarse)),
        "alignment": alignment,
    }

(root / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
manifest = {
    "model": "gpt-image-2.5-flare", "operation": "images.edit",
    "size": "1536x1024", "quality": "high", "panelsPerRequest": 4,
    "sourceFps": source["fps"], "sourceIndices": source["indices"],
    "playbackUniqueFps": 15, "interpolation": "none",
    "preludeSha256": source["preludeSha256"],
    "stabilization": "ORB/RANSAC affine alignment; fixed inner guards and central body, feathered mask",
    "requests": [],
}
for style in report:
    for group in range(4):
        relative = f"raw/{style}-{group:02}.png"
        manifest["requests"].append({
            "style": style, "sourceIndices": source["indices"][group*4:group*4+4],
            "images": [f"../../generated-details/{style}-detail.png",
                       f"controls/{style}-{group:02}.png", f"../image-2.5/{style}-flare-grid.png"],
            "prompt": f"prompts/{style}-{group:02}.txt", "output": relative,
            "outputSha256": hashlib.sha256((root / relative).read_bytes()).hexdigest(),
        })
(root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: {n: v[n] for n in ("generatedKeyframes", "uniqueFps", "meanAdjacentRgbMAE", "meanCoarseRgbMAE")} for k, v in report.items()}, indent=2))
