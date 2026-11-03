"""Prepare source controls/prompts; generate with the imagegen CLI separately."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

output = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/effects/generated-keyframe-experiments/flare-dense16")
data = json.loads((output / "source-frames.json").read_text(encoding="utf-8"))
(output / "controls").mkdir(exist_ok=True)
(output / "prompts").mkdir(exist_ok=True)
(output / "raw").mkdir(exist_ok=True)
for style, frames in data["styles"].items():
    for group in range(4):
        group_frames = frames[group * 4:group * 4 + 4]
        sheet = Image.new("RGB", (1800, 1200), (20, 29, 28))
        for n, frame in enumerate(group_frames):
            canvas = Image.new("RGBA", (900, 600), (23, 33, 31, 255))
            box = data["topology"]["box"]
            drone = Image.open("simulator/public/drone.png").convert("RGBA").resize((round(box["width"]), round(box["height"])))
            canvas.alpha_composite(drone, (round(box["x"]), round(box["y"])))
            glow = Image.new("RGBA", canvas.size)
            draw = ImageDraw.Draw(glow)
            for side in ("left", "right"):
                for point in data["topology"][side]:
                    color = tuple(frame["rgb"][point["index"]])
                    x, y = point["x"], point["y"]
                    draw.ellipse((x-9, y-9, x+9, y+9), fill=(*color, 150))
            canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(6)))
            draw = ImageDraw.Draw(canvas)
            for side in ("left", "right"):
                for point in data["topology"][side]:
                    color = tuple(frame["rgb"][point["index"]])
                    x, y = point["x"], point["y"]
                    draw.ellipse((x-4, y-4, x+4, y+4), fill=(*color, 255))
            draw.text((18, 14), f"{style}: source frame {frame['index']}; {frame['index']/30:.3f}s", fill="white")
            for i, color in enumerate(frame["rgb"]):
                draw.rectangle((20+i*21, 558, 39+i*21, 578), fill=tuple(color))
            sheet.paste(canvas.convert("RGB"), ((n % 2)*900, (n // 2)*600))
        sheet.save(output / "controls" / f"{style}-{group:02}.png")
        indices = [f["index"] for f in group_frames]
        prompt = f"""Precise light-only editing, continuous animation keyframes. Output EXACTLY a 2x2 contact sheet, four equal 768x512 panels, no gaps, borders or labels. Reading order is top-left, top-right, bottom-left, bottom-right: source frames {indices} at 30fps. Time advances 2/30 seconds per panel; tiny incremental changes, not four unrelated designs.
Input 1: original series artwork; preserve the exact drone silhouette, dense four protective grills, propellers, central body, bottom camera, scale, position, viewpoint, background geometry and album-art finish. No camera/vehicle movement, zoom, rotation, new objects or deforming guards.
Input 2: actual simulation controls for THESE four time steps, including exact 40 logical RGB swatches. Copy their per-LED lit/off states, brightness and color grouping onto the two outer S-shaped LED paths. Mirror the same logical state on left and right. No closed ring across front/back. Ignore labels and gray scenery of controls.
Input 3: previous approved FLARE sequence at source frames 0,8,16,24. Use as continuity anchor for artwork identity, composition and background shapes; interpolate only the effect states to the time steps in input 2. All neutral drone pixels and all large background shapes stay fixed throughout this and all other groups. The bright color segments and highlights move gradually; no whole-image exposure pumping.
"""
        if style == "styleCyberpunk":
            prompt += "Cyberpunk: source magenta/cyan phase groups shift along the strip; rare localized glitch highlights last briefly. Background existing diagonal rails carry the same advancing magenta/cyan scan highlights. Progress measured by ABSOLUTE source time, about 64 pixels of diagonal highlight travel per second within each panel, so all groups join consistently. Keep cyan and magenta vivid; no rainbow, no global strobe."
        else:
            prompt += "Matrix: source independent green LED points activate randomly then decay, NOT a traveling chase. Background existing digital-rain columns stay fixed but bright heads fall DOWNWARD by 56 pixels per second within each panel, at the ABSOLUTE source time, with fading tails; columns remain asynchronous. Green only. Neutral drone stays unchanged; background rain is thematic, not actual strip travel."
        (output / "prompts" / f"{style}-{group:02}.txt").write_text(prompt + "\n", encoding="utf-8")
print("Prepared 8 source control sheets and exact prompts for gpt-image-2.5-flare.")
