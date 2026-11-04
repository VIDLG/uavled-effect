"""Background hierarchy for Ocean/Aurora, retaining their calibrated source LEDs."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
import hashlib
from source_motion import smoothstep, save_image, align_generated

REVISION = Path('assets/effects/generated-motion-gallery/background-depth-v3')
PREVIOUS_REVISION = REVISION.with_name('background-separation-v2')
VIDEO_SUFFIX = 'background-v3-loop.mp4'
TARGETS = ('styleOcean', 'styleAurora')


def backdrop(rgb, distance, phase, seconds, detail=None, period=256/30):
    """Quiet near-strip region, broad slow background fronts, capped after texture."""
    near = smoothstep(24, 80, distance)[..., None]
    luma = np.sum(rgb*np.array([.2126, .7152, .0722]), axis=2, keepdims=True)
    saturation = .50+.46*near
    color = rgb*saturation+luma*(1-saturation)
    envelope = .86+.14*(.5+.5*np.cos(phase-seconds*2*np.pi/period))
    color = color*envelope[..., None]
    if detail is not None:
        color *= detail[..., None]
    ceiling = 28+152*near
    return color*np.minimum(1, ceiling/np.maximum(color.max(axis=2, keepdims=True), 1))


def prepare():
    for folder in ('references', 'background-prompts', 'background-raw', 'bases', 'masks', 'controls', 'prompts', 'raw'):
        (REVISION/folder).mkdir(parents=True, exist_ok=True)
    rules = {'revision': REVISION.name, 'model': 'gpt-image-2.5-flare', 'effects': list(TARGETS),
        'source': 'Unchanged native-JavaScript RGB and calibrated two mirrored S-shaped paths',
        'composition': 'Source LED core texture and original neutral drone material are restored after background editing',
        'previousRevision': PREVIOUS_REVISION.as_posix(),
        'hierarchy': '28/255 maximum RGB within 24 px of the strip, rising smoothly to 180/255 at 80 px; richer outer-scene saturation and depth, with an 8.533-second broad front independent of local LED phase',
        'styles': {'styleOcean': 'Retain approved deep-water feel; add layered cobalt/teal wave ridges, translucent ripple intersections and restrained foam/glints across the outer scene, not just the corners',
                   'styleAurora': 'Retain approved polar-night feel; add overlapping turquoise/blue-violet curtains at different depths, fine vertical rays and sparse star clusters; actual magenta source LEDs remain foreground'}}
    (REVISION/'rules.json').write_text(json.dumps(rules, indent=2)+'\n', encoding='utf-8')
    for style in TARGETS:
        original = Image.open(PREVIOUS_REVISION/'bases'/f'{style}.png').convert('RGB').resize((1536, 1024), Image.Resampling.LANCZOS)
        save_image(original, REVISION/'references'/f'{style}.png')
        theme = ("Preserve the approved DEEP OCEAN atmosphere, but enrich its too-empty outer water. Build three readable depths: broad cobalt/teal rolling wave ridges at the outer left/right; finer intersecting translucent ripples across the top and bottom; selected delicate silver-cyan foam flecks and water glints. Fill the outer scene with composed, flowing detail and visible blue-to-teal tonal variation. Use asymmetrical wave clusters and quieter connecting water. This should feel like an elegant richly textured ocean album cover, not flat navy and not a neon whirlpool."
                 if style == 'styleOcean' else
                 "Preserve the approved POLAR NIGHT atmosphere, but enrich its too-empty sky. Compose several overlapping translucent AURORA curtains at visibly different depths: blue-violet farther away, turquoise/teal in front, delicate vertical light rays within each folded ribbon. Sweep these across the upper margin and down the outer sides, with a softer reflected ribbon along the lower margin. Add sparse crisp star clusters, a few faint fine star-dust veils, and a nuanced indigo-to-cobalt sky. The colored curtain folds must read clearly at thumbnail size. Elegant atmospheric album art, not a flat dark vignette and not a hot-pink fantasy vortex.")
        prompt = f"""EDIT ONLY THE BACKGROUND of this existing album illustration. Keep the exact original drone, four dense rotor guards, camera, silhouette, position, size, viewpoint and illustration finish. Keep both dense S-shaped physical LED strips and their original source colors. Output 1536x1024, no text or borders.
{theme}
The small foreground LED points remain the brightest accents. The OUTER background needs clearly visible medium-bright colored layers and detailed highlights, not uniformly low exposure. Keep only a NARROW quiet darker-water/sky transition immediately beside each physical strip; do not expand that quiet region across the whole scene. Do not duplicate the strip's segmentation in a nearby background ribbon. Background structures are broader and slower than the LED cadence.
Keep tasteful depth, asymmetric visual rhythm and full-bleed texture. No black cutout, blank central rectangle, uniform halo outline or hard vignette. No smoke/flame fantasy effects, gold decoration, extra LEDs or new drone geometry. Preserve the same refined illustration finish; change only the BACKGROUND richness, not the drone or effect identity.
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
Crucial hierarchy: tiny foreground LED points/halos are the bright saturated subject. Only the immediate surrounding background stays calm, dark and free of competing light heads. Preserve the RICH layered outer waves or overlapping aurora curtains in the supplied scene, their visible medium-bright color, fine glints or stars and depth. Broad background fronts move slowly, independently of local strip phase. No luminous ribbon hugging the strip, no giant glowing vortex, no central cutout or hard halo boundary. Do not flatten the outer scene into dark empty space.
Add only coherent light microtexture. Do not redesign the drone, change the palette, invent LEDs, or generate four copies with only global exposure changes.
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
        field = AlbumField(definition, data['styles'][style], revised=False)
        name = f'{style}-{VIDEO_SUFFIX}' if current else f'{style}-background-v2-loop.mp4'
        video = cv2.VideoCapture(str(ROOT/name))
        samples = []
        try:
            for index in range(0, 256, 32):
                video.set(cv2.CAP_PROP_POS_FRAMES, index*2)
                ok, bgr = video.read()
                if not ok:
                    raise RuntimeError(f'Cannot decode {style} frame {index*2}')
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                outer = rgb[(field.distance > 80) & (field.background_mask > .99)]
                samples.append({'sourceFrame': index, **measured_contrast(field, rgb),
                    'outerMeanLuma': float(np.mean(outer@np.array([.2126, .7152, .0722]))),
                    'outerMeanChroma': float(np.mean(outer.max(axis=1).astype(float)-outer.min(axis=1)))})
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
            'minimumRatioAfter': float(after.min()), 'meanRatioRetention': float(np.mean(after/before))}
        assert after.min() > 2, (style, after)
        assert np.mean(after/before) > .8, (style, before, after)
        for metric in ('outerMeanLuma', 'outerMeanChroma'):
            result['effects'][style][metric+'Growth'] = float(np.mean([f[metric] for f in current[style]])/np.mean([f[metric] for f in previous[style]]))
            assert result['effects'][style][metric+'Growth'] > 1.25, (style, metric)
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
