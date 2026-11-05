"""Rebuild v6 geometry/provenance evidence; does not call the image API."""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from motion_gallery import AlbumField
from outer_rim import OuterRim, REPAIRS
from source_motion import MotionField, replace_regions


def write(path, data):
    path.write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')


def file_record(path, role=None):
    result = {'path': path.relative_to(REPAIRS).as_posix(),
              'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if role:
        result['role'] = role
    return result


def provenance():
    requests = []
    folders = [REPAIRS]+sorted(p for p in REPAIRS.iterdir() if p.is_dir())
    for folder in folders:
        if not (folder/'repaired.png').exists():
            continue
        steps = [('input.png', 'repair-prompt.txt', 'repaired.png')]
        if (folder/'repaired-draft.png').exists():
            steps = [('input.png', 'repair-prompt.txt', 'repaired-draft.png'),
                     ('repaired-draft.png', 'cleanup-prompt.txt', 'repaired-top-clean.png'),
                     ('repaired-top-clean.png', 'lower-cleanup-prompt.txt', 'repaired.png')]
        for target, prompt, output in steps:
            requests.append({'style': 'styleNeon' if folder == REPAIRS else folder.name,
                'model': 'gpt-image-2.5-flare', 'mode': 'fallback CLI edit',
                'size': '1536x1024', 'quality': 'high',
                'inputs': [file_record(folder/target, 'edit target'),
                           file_record(folder/'original.png', 'mechanical reference')],
                'prompt': file_record(folder/prompt), 'output': file_record(folder/output)})
    write(REPAIRS/'generation.json', {'revision': 'outer-rim-v6',
        'cli': 'imagegen/scripts/image_gen.py edit --model gpt-image-2.5-flare --image EDIT_TARGET --image MECHANICAL_REFERENCE --prompt-file PROMPT --size 1536x1024 --quality high --out OUTPUT --no-augment',
        'requests': requests,
        'mapping': {'edit': 'Neutral physical perimeter and upper diagonal/lower corner joins; no emissive texture.',
            'composite': '20px solid repair plus 12px transition around original carrier AND endpoint extensions. Preserve central drone pixels outside repair bounds. Use generated external silhouette, never adjacent-pixel duplicate rail.',
            'emitters': 'Original dense profile moved 6px outwards; unchanged texture, size, count, native RGB source and timing.',
            'backgrounds': 'Existing generated backgrounds and motion retained.'},
        'validationLimit': 'Image-space/browser evidence, not CAD or hardware validation.'})


def fields():
    gallery = Path('assets/effects/generated-motion-gallery')
    data = json.loads((gallery/'source-frames.json').read_text(encoding='utf-8'))
    for definition in data['definitions']:
        yield AlbumField(definition, data['styles'][definition['id']])
    root = Path('assets/effects/single-image-motion')
    old = json.loads((REPAIRS.parent/'rim-v5/original-catalogs.json').read_text(encoding='utf-8'))['rainbow']
    cal = json.loads((root/'calibration.json').read_text(encoding='utf-8'))
    yield MotionField('effectRainbow', np.zeros((1, 40, 3), np.float32),
        base=np.asarray(Image.open(root/old['base']).convert('RGB')),
        paths=(np.asarray(cal['left']), np.asarray(cal['right'])))


def inspect():
    sheet = Image.new('RGB', (1536, 5*552), (24, 24, 24))
    corners = Image.new('RGB', (1060, 10*276), (24, 24, 24))
    records = []
    for i, field in enumerate(fields()):
        rim = OuterRim(field)
        off = replace_regions(np.full_like(field.base, 24), rim.body, rim.body_mask)
        on = replace_regions(off, rim.shift(field.base), rim.band)
        Image.fromarray(np.hstack([off, on])).save(REPAIRS/(field.style+'-off-on.png'))
        sheet.paste(Image.fromarray(off), (i%2*768, i//2*552+40))
        ImageDraw.Draw(sheet).text((i%2*768+10, i//2*552+10), field.style, fill='white')
        for n, box in enumerate([(110,35,270,195), (498,35,658,195),
                                 (110,305,270,465), (498,305,658,465)]):
            corners.paste(Image.fromarray(off).crop(box).resize((256,256)), (n*268, i*276+20))
        ImageDraw.Draw(corners).text((8, i*276+4), field.style+' | upper-left / upper-right / lower-left / lower-right', fill='white')
        components = cv2.connectedComponents((rim.body_mask > .5).astype(np.uint8))[1]
        protected = rim.lip > .999
        records.append({'id': field.style, 'fixedGuardPixels': int(protected.sum()),
            'allFixedGuardPixelsConnected': bool(np.all(components[protected] == components[256,384])),
            'guardLightMaskOverlapMax': float((rim.lip*rim.band).max())})
    sheet.save(REPAIRS/'all-guards.jpg', quality=94)
    corners.save(REPAIRS/'all-joins.jpg', quality=94)
    write(REPAIRS/'all-geometry.json', records)
    compare = Image.new('RGB', (800,440), (24,24,24))
    for i, version in enumerate(['v5', 'v6']):
        root = REPAIRS.parent/'shared'
        rgb = np.asarray(Image.open(root/f'rim-drone-{version}.png'))
        mask = np.asarray(Image.open(root/f'rim-masks-{version}.png'))[...,0]/255
        off = Image.fromarray(np.round(rgb*mask[...,None]+24*(1-mask[...,None])).astype(np.uint8))
        compare.paste(off.crop((110,45,250,185)).resize((400,400)), (i*400,40))
        ImageDraw.Draw(compare).text((i*400+15,15), ['BEFORE','AFTER'][i], fill='white')
    compare.save(REPAIRS/'join-comparison.png')
    screenshot = REPAIRS/'browser-off.png'
    if screenshot.exists():
        im = Image.open(screenshot)
        box = tuple(round(v*im.width/768) for v in (110,40,265,195))
        im.crop(box).resize((620,620)).save(REPAIRS/'browser-off-corner.png')


if __name__ == '__main__':
    provenance()
    inspect()
