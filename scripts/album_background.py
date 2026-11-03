"""Background hierarchy for Ocean/Aurora, retaining their calibrated source LEDs."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
import hashlib
from source_motion import smoothstep, save_image, align_generated

REVISION = Path('assets/effects/generated-motion-gallery/background-separation-v2')
TARGETS = ('styleOcean', 'styleAurora')


def backdrop(rgb, distance, phase, seconds, detail=None):
    """Quiet near-strip region, broad slow background fronts, capped after texture."""
    near = smoothstep(16, 100, distance)[..., None]
    luma = np.sum(rgb*np.array([.2126, .7152, .0722]), axis=2, keepdims=True)
    saturation = .36+.42*near
    color = rgb*saturation+luma*(1-saturation)
    envelope = .86+.14*(.5+.5*np.cos(phase-seconds*2*np.pi/(256/30)))
    color = color*envelope[..., None]
    if detail is not None:
        color *= detail[..., None]
    ceiling = 28+82*near
    return color*np.minimum(1, ceiling/np.maximum(color.max(axis=2, keepdims=True), 1))


def prepare():
    for folder in ('references', 'background-prompts', 'background-raw', 'bases', 'masks', 'controls', 'prompts', 'raw'):
        (REVISION/folder).mkdir(parents=True, exist_ok=True)
    rules = {'revision': 'background-separation-v2', 'model': 'gpt-image-2.5-flare', 'effects': list(TARGETS),
        'source': 'Unchanged native-JavaScript RGB and calibrated two mirrored S-shaped paths',
        'composition': 'Source LED core texture and original neutral drone material are restored after background editing',
        'hierarchy': '28/255 maximum RGB near the strip, rising smoothly to 110/255 at 100 px; broad background fronts take one 8.533-second cycle, independently of local LED phase',
        'styles': {'styleOcean': 'Deep ink/navy, sparse blue-cyan tide marks at outer corners; calm water behind strips',
                   'styleAurora': 'Cold midnight-indigo and muted blue-violet; distant slender aurora curtains at top/outer edges; magenta source LEDs remain the vivid foreground'}}
    (REVISION/'rules.json').write_text(json.dumps(rules, indent=2)+'\n', encoding='utf-8')
    for style in TARGETS:
        original = Image.open(f'assets/effects/generated-details/{style}-detail.png').convert('RGB')
        save_image(original, REVISION/'references'/f'{style}.png')
        theme = ("Deep-ocean editorial album art: predominantly ink navy and slate blue. Sparse, fine cyan tide contours and low foam detail live near the OUTER corners and far perimeter. The water directly beside both S-shaped LED strips is calm, dark and low contrast. Remove the bright cyan whirlpool that hugs the drone silhouette."
                 if style == 'styleOcean' else
                 "Quiet polar-night editorial album art: predominantly midnight indigo and muted blue-violet, with slender distant aurora curtains near the TOP and OUTER edges. Only sparse subdued violet/magenta accents far from the drone. Remove the huge hot-pink luminous whirlpool wrapped around the drone. The sky beside the strips is cold, dark and softly textured.")
        prompt = f"""EDIT ONLY THE BACKGROUND of this existing album illustration. Keep the exact original drone, four dense rotor guards, camera, silhouette, position, size, viewpoint and illustration finish. Keep both dense S-shaped physical LED strips and their original source colors. Output 1536x1024, no text or borders.
{theme}
The foreground LED points and their small halos must be the brightest, most saturated, most readable moving subject. Background must be clearly secondary in brightness, saturation and visual frequency. Do not duplicate the LED strip's color segmentation in a nearby background ribbon. Place background bright features away from the bands, use broad slow structures rather than matching LED cadence.
Keep tasteful depth and full-bleed texture. Make a subtle continuous contrast falloff beside the drone, NOT a black cutout, blank central rectangle, uniform halo outline or hard vignette. No smoke/flame fantasy effects, gold decoration, extra LEDs or new drone geometry. This is the same refined illustrated series, not a new product rendering.
"""
        (REVISION/'background-prompts'/f'{style}.txt').write_text(prompt, encoding='utf-8')
    print('Prepared background revision mapping and two exact edit prompts.')


def compose():
    from motion_gallery import AlbumField, ROOT
    data = json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    alignment = {}
    for definition in data['definitions']:
        style = definition['id']
        if style not in TARGETS:
            continue
        original = AlbumField(definition, data['styles'][style], revised=False)
        with Image.open(REVISION/'background-raw'/f'{style}.png') as image:
            edited = np.asarray(image.convert('RGB').resize((768, 512), Image.Resampling.LANCZOS))
        edited, alignment[style] = align_generated(edited, original)
        vertices = np.vstack([original.left, original.right, [[220,31],[548,31],[339,43],[429,43],[308,435],[460,435]]]).astype(np.int32)
        inside = np.zeros((512, 768), np.uint8)
        cv2.fillConvexPoly(inside, cv2.convexHull(vertices), 1)
        hsv = cv2.cvtColor(original.base, cv2.COLOR_RGB2HSV).astype(np.float32)
        hold = inside*(1-smoothstep(.27, .50, hsv[..., 1]/255))
        hold = np.maximum(hold, 1-smoothstep(6, 14, original.distance))
        hold[(inside > 0) & (original.mask == 0)] = 1
        base = np.round(original.base*hold[..., None]+edited*(1-hold[..., None])).astype(np.uint8)
        save_image(Image.fromarray(base), REVISION/'bases'/f'{style}.png')
        save_image(Image.fromarray(np.round((1-hold)*255).astype(np.uint8)), REVISION/'masks'/f'{style}.png')
    (REVISION/'alignment.json').write_text(json.dumps(alignment, indent=2)+'\n')
    print('Composited edited backgrounds with original neutral material and fixed LED carriers.')


def controls():
    from motion_gallery import AlbumField, ROOT
    data = json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    for definition in data['definitions']:
        style = definition['id']
        if style not in TARGETS:
            continue
        field = AlbumField(definition, data['styles'][style])
        for batch in range(2):
            indices = definition['keyframes'][batch*4:batch*4+4]
            grid = Image.new('RGB', (1536, 1024))
            for slot, index in enumerate(indices):
                grid.paste(Image.fromarray(field.render(index/30)), ((slot%2)*768, (slot//2)*512))
            save_image(grid, REVISION/'controls'/f'{style}-{batch:02}.png')
            prompt = f"""Refine image 1, a precisely controlled 2x2 storyboard; image 2 fixes the drone and revised album background identity. Output exactly 1536x1024, four equal 768x512 panels, no gaps or text.
Source frames {indices}, reading order, 30 source FPS. Function: {definition['rules']}.
Keep each panel's DIFFERENT source LED color sections at the exact provided positions. Bright crests progress forward, toward lower logical LED indices on both mirrored S-shaped strips. All guards, carriers, central body, camera, framing and neutral material exposure stay fixed.
Crucial hierarchy: tiny foreground LED points/halos are the bright saturated subject. The immediate surrounding background stays calm, dark, less saturated and free of competing light heads. Far-background broad fronts move slowly, independently of the strip's local phase. Preserve the ink/navy or indigo atmosphere, distant thin light features and refined existing illustration style. No luminous ribbon hugging the strip, no giant glowing vortex, no restoring the previous saturated full-screen cyan/magenta arrangement. No central cutout or hard halo boundary.
Add only coherent light microtexture. Do not brighten the background, redesign the drone, change the palette, invent LEDs, or generate four copies with only global exposure changes.
"""
            (REVISION/'prompts'/f'{style}-{batch:02}.txt').write_text(prompt, encoding='utf-8')
    print('Prepared four source-position storyboards with separate background hierarchy.')


def measured_contrast(field, frame):
    led, context = [], []
    for points, offset in ((field.left, -25), (field.right, 25)):
        points = np.round(points).astype(int)
        led.extend(frame[points[:, 1], points[:, 0]])
        context.extend(frame[points[:, 1], points[:, 0]+offset])
    weights = np.array([.2126, .7152, .0722])
    light = float(np.mean(np.asarray(led)@weights))
    background = float(np.mean(np.asarray(context)@weights))
    return {'ledMeanLuma': light, 'backgroundMeanLuma': background, 'ratio': light/(background+1)}


def sample_videos(current=False):
    from motion_gallery import AlbumField, ROOT
    data = json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    result = {}
    for definition in data['definitions']:
        style = definition['id']
        if style not in TARGETS:
            continue
        field = AlbumField(definition, data['styles'][style])
        name = f'{style}-background-v2-loop.mp4' if current else f'{style}-loop.mp4'
        video = cv2.VideoCapture(str(ROOT/name))
        samples = []
        try:
            for index in range(0, 256, 32):
                video.set(cv2.CAP_PROP_POS_FRAMES, index*2)
                ok, bgr = video.read()
                if not ok:
                    raise RuntimeError(f'Cannot decode {style} frame {index*2}')
                samples.append({'sourceFrame': index, **measured_contrast(field, cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))})
        finally:
            video.release()
        result[style] = samples
    return result


def capture():
    (REVISION/'contrast-baseline.json').write_text(json.dumps(sample_videos(), indent=2)+'\n')
    print('Captured eight decoded baseline frames per target for local strip/background contrast.')


def verify():
    from motion_gallery import ROOT
    previous = json.loads((REVISION/'contrast-baseline.json').read_text())
    current = sample_videos(current=True)
    result = {'metric': 'mean Rec709-weighted RGB at 80 calibrated LED centers / (mean at 25px outward + 1), eight decoded video times; a visibility proxy, not human-study acceptance', 'effects': {}}
    for style in TARGETS:
        before = np.array([frame['ratio'] for frame in previous[style]])
        after = np.array([frame['ratio'] for frame in current[style]])
        result['effects'][style] = {'before': previous[style], 'after': current[style],
            'meanRatioBefore': float(before.mean()), 'meanRatioAfter': float(after.mean()),
            'minimumRatioAfter': float(after.min()), 'meanImprovement': float(np.mean(after/before))}
        assert after.min() > 2, (style, after)
        assert np.mean(after/before) > 1.8, (style, before, after)
    hashes = json.loads((REVISION/'before-hashes.json').read_text())
    result['unchangedOtherVideos'] = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == digest
        for name, digest in hashes.items() if name.split('-loop')[0] not in TARGETS}
    assert all(result['unchangedOtherVideos'].values())
    (REVISION/'contrast-verification.json').write_text(json.dumps(result, indent=2)+'\n')
    sheet = Image.new('RGB', (1536, 1064), (14, 20, 28))
    for row, style in enumerate(TARGETS):
        y = row*532
        for col, (label, path) in enumerate((('BEFORE', REVISION/'before'/f'{style}.jpg'), ('AFTER', ROOT/'posters'/f'{style}.jpg'))):
            sheet.paste(Image.open(path).convert('RGB'), (col*768, y+20))
            ImageDraw.Draw(sheet).text((col*768+12, y+4), f'{style} | {label}', fill='white')
    save_image(sheet, REVISION/'comparison.jpg', quality=93)
    print(json.dumps({style: {k: v for k, v in result['effects'][style].items() if k not in ('before', 'after')} for style in TARGETS}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=('prepare', 'compose', 'controls', 'capture', 'verify'))
    globals()[parser.parse_args().mode]()
