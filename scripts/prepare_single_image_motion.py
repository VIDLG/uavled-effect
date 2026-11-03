"""One fixed artwork, a phase/mask atlas and a tiny source RGB palette."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from source_motion import MotionField, resample_path, smoothstep, save_image

root = Path('assets/effects/single-image-motion')
rules = json.loads((root/'index.json').read_text(encoding='utf-8'))
base = np.asarray(Image.open(rules['reference']).convert('RGB').resize((768, 512), Image.Resampling.LANCZOS))
upper = [[172, 98], [161, 118], [153, 140], [151, 162], [154, 184], [161, 207], [175, 230], [185, 245]]
lower = [[183, 258], [169, 278], [156, 302], [150, 326], [151, 352], [160, 378], [176, 404], [192, 420]]
left = np.vstack([resample_path(upper, 20), resample_path(lower, 20)])
right = left.copy()
right[:, 0] = 768-right[:, 0]
field = MotionField('effectRainbow', np.zeros((1, 40, 3), np.float32), base=base, paths=(left, right))

rgb = base.astype(np.float32)
chroma = rgb-rgb.min(axis=2, keepdims=True)
r, g, b = np.moveaxis(chroma, -1, 0)
# Inverse of the runtime wheel's three linear R->G->B->R edges.
phase = np.where(b <= np.minimum(r, g), g/np.maximum(r+g, 1),
                 np.where(r <= np.minimum(g, b), 1+b/np.maximum(g+b, 1), 2+r/np.maximum(r+b, 1)))/3
path_phase = field.coordinate/40
weight = 1-smoothstep(4, 12, field.distance)
# Mix phase on the circle so the red boundary never interpolates through cyan.
vector = np.exp(phase*2j*np.pi)*(1-weight)+np.exp(path_phase*2j*np.pi)*weight
phase = (np.angle(vector)/(2*np.pi)) % 1
saturation = (rgb.max(axis=2)-rgb.min(axis=2))/np.maximum(rgb.max(axis=2), 1)
mask = np.maximum(field.background_mask, (1-smoothstep(5, 13, field.distance))*smoothstep(.04, .25, saturation))
# Ten meaningful phase bits keep color error below one raw wheel unit while
# removing noisy sub-byte hue fluctuations from the static generated texture.
encoded = ((np.round(phase*1024).astype(np.uint32)*64) % 65536).astype(np.uint16)
atlas = np.dstack([encoded//256, encoded%256, np.round(mask*255)]).astype(np.uint8)
save_image(Image.fromarray(base), root/rules['base'])
save_image(Image.fromarray(atlas), root/rules['map'])
save_image(Image.fromarray(np.array([rules['sourcePalette']], np.uint8)), root/rules['paletteTexture'])
save_image(Image.fromarray(base), root/rules['poster'], quality=92)
guide = Image.fromarray(base.copy())
draw = ImageDraw.Draw(guide)
for path in (left, right):
    for i, (x, y) in enumerate(path):
        draw.ellipse((x-2, y-2, x+2, y+2), fill='yellow')
        if i % 5 == 0:
            draw.text((x+4, y), str(i), fill='white')
save_image(guide, root/'effectRainbow-calibration.jpg', quality=90)
(root/'calibration.json').write_text(json.dumps({'left': left.tolist(), 'right': right.tolist(),
    'atlasChannels': {'R,G': 'phase uint16 big endian / 65535', 'B': 'color-zone weight / 255'},
    'minimumLedPeak': rules['fullLit']['minimumLedPeak'], 'offLedCount': rules['fullLit']['offLedCount'],
    'neutralPixels': int(np.sum(atlas[..., 2] == 0))}, indent=2)+'\n')
print('Prepared one artwork, phase atlas and RGB lookup. All source LEDs remain lit.')
