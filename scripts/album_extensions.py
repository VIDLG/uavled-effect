"""Source-specific motion policies and artwork calibration for four new albums."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from source_motion import resample_path, save_image, smoothstep
from album_background import backdrop

ROOT = Path('assets/effects/generated-motion-gallery')
REVISION = ROOT/'motion-expansion-v1'
STYLES = ('styleLava','styleGalaxy','styleNeon','styleHeartbeat')
SEEDS = {
    'styleLava': ([[161,98],[148,125],[140,155],[141,180],[150,208],[165,233],[175,249]],
                  [[171,259],[158,279],[145,302],[138,330],[139,353],[148,379],[164,407],[181,429]]),
    'styleGalaxy': ([[171,102],[157,120],[150,145],[150,169],[158,198],[172,224],[183,246]],
                    [[180,256],[166,280],[153,306],[148,332],[152,361],[165,390],[184,418]]),
    'styleNeon': ([[157,97],[143,115],[136,141],[135,165],[140,190],[152,221],[164,249]],
                  [[163,258],[150,284],[138,312],[134,341],[138,371],[149,403],[166,438]]),
    'styleHeartbeat': ([[165,100],[152,121],[145,145],[145,169],[151,194],[162,221],[175,250]],
                       [[173,258],[160,282],[148,308],[142,338],[147,367],[164,402],[188,430]])}


def paths(style):
    record = json.loads((REVISION/'calibration.json').read_text(encoding='utf-8'))[style]
    return tuple(np.asarray(record[side],np.float32) for side in ('left','right'))


def background(field, seconds, colors, detail):
    period = field.definition.get('periodFrames',256)/30
    phase = 2*np.pi*(field.x/768*1.3 + field.y/512*.7)
    scene=field.base.astype(np.float32)
    if field.style == 'styleNeon':
        cyan=(scene[...,1]>scene[...,0]*1.3)&(scene[...,2]>scene[...,0]*1.3)
        scene[cyan]=scene[cyan].max(axis=1,keepdims=True)*np.array([.28,.04,1])
    rgb = backdrop(scene,field.distance,phase,seconds,detail,period)
    if field.style == 'styleHeartbeat':
        # One brightness for both complete strips; pulse only chromatic scene motifs.
        level = float(colors.max())/max(float(field.frames.max()),1)
        rgb *= .12+.88*level
    elif field.style == 'styleGalaxy':
        # White source sparkles drive sparse star texture, not whole-scene exposure.
        stars = smoothstep(.65,.93,field.value)*(1-smoothstep(.15,.6,field.art_saturation))
        activity = float(np.mean(colors.min(axis=1)))/max(float(field.frames.max()),1)
        rgb *= (1-stars[...,None]) + stars[...,None]*(.35+3*activity)
    return rgb


def prepare():
    from motion_gallery import AlbumField
    for folder in ('references','controls','prompts','raw'):
        (REVISION/folder).mkdir(parents=True,exist_ok=True)
    data=json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    records={}
    for style in STYLES:
        base=np.asarray(Image.open(f'assets/effects/generated-details/{style}-detail.png').convert('RGB').resize((768,512),Image.Resampling.LANCZOS))
        hsv=cv2.cvtColor(base,cv2.COLOR_RGB2HSV).astype(float)
        score=hsv[...,2]*(1-hsv[...,1]/255)
        score-=cv2.GaussianBlur(score,(0,0),2)
        sides=[]
        for mirrored in (False,True):
            segments=[]
            for segment in SEEDS[style]:
                snapped=[]
                for x,y in segment:
                    x=768-x if mirrored else x
                    tile=score[y-5:y+6,x-8:x+9]
                    py,px=np.unravel_index(tile.argmax(),tile.shape)
                    snapped.append([int(x-8+px),int(y-5+py)])
                segments.append(resample_path(snapped,20))
            sides.append(np.vstack(segments))
        records[style]={'left':sides[0].tolist(),'right':sides[1].tolist(),
            'method':'Independently locate bright emitter cores in narrow manually selected artwork corridors; resample each upper/lower physical curve to 20 logical samples. Inspect the guide before generation.'}
        save_image(Image.fromarray(base),REVISION/'references'/f'{style}.png')
        guide=Image.fromarray(base.copy());draw=ImageDraw.Draw(guide)
        for side in sides:
            draw.line([tuple(p) for p in side],fill='yellow',width=1)
        save_image(guide,REVISION/'controls'/f'{style}-calibration.jpg',quality=94)
    (REVISION/'calibration.json').write_text(json.dumps(records,indent=2)+'\n')
    definitions=[d for d in data['definitions'] if d['id'] in STYLES]
    (REVISION/'rules.json').write_text(json.dumps({'model':'gpt-image-2.5-flare','definitions':definitions,
        'hierarchy':'Original artwork and fixed neutral drone; 24px quiet surround, rich outer scene; source RGB on independently calibrated physical paths. Generated anchors supply bounded transported microtexture only.',
        'singleArtwork':'Heartbeat has no spatial displacement, so one existing generated artwork plus actual source RGB is sufficient. No new generated keyframes are claimed.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for definition in definitions:
        style=definition['id'];field=AlbumField(definition,data['styles'][style])
        if definition.get('singleArtwork'):
            continue
        for batch in range(2):
            indices=definition['keyframes'][batch*4:batch*4+4]
            grid=Image.new('RGB',(1536,1024))
            for slot,index in enumerate(indices):
                grid.paste(Image.fromarray(field.render(index/30)),((slot%2)*768,(slot//2)*512))
            save_image(grid,REVISION/'controls'/f'{style}-{batch:02}.png')
            movement = ("Keep each panel's LED state and color arrangement EXACTLY as image 1. Refine fine luminous microtexture only. Neon has an identical magenta base on most frames and brief exact-sector color changes in the selected other frames: preserve those discrete color-block differences, do NOT invent continuous spatial displacement or moving light balls."
                if style=='styleNeon' else "Keep each panel's distinct LED phase, color arrangement and moving crest positions EXACTLY as image 1. Refine fine luminous microtexture only. Bright sections must advance toward LOWER logical LED indices on BOTH calibrated strips; no ping-pong oscillation. The Galaxy's localized sparkles are independent flashes, not traveling balls.")
            changes = ("Only luminous features change: brief native-source color blocks for Neon. Scenery geometry stays fixed. Neon anchors show actual color-state differences, not global exposure changes."
                if style=='styleNeon' else "Only luminous features move: warm heat fronts for Lava, blue-violet nebula fronts and sparse white star flashes for Galaxy, ordered native-source neon segments for Neon. Scenery geometry stays fixed. Different frames must have genuinely different light-section positions, not just global exposure changes.")
            prompt=f'''Use case: compositing. Edit image 1, a precisely controlled 2x2 animation storyboard. Image 2 is the fixed original artwork and drone identity. Output 1536x1024, four equal 768x512 panels, no gaps, labels or text.
Source frames {indices} at 30 FPS, reading order. Actual source behavior: {definition['rules']}.
{movement}
Lock the original drone, all four dense guards, propellers, camera, framing, material exposure and BOTH physical S-shaped strips. Do not move a strip outward, simplify guards, add LEDs in free space, recolor the neutral drone or redesign the scene. Keep the already rich outer lava/nebula/neon album background, with its quiet narrow surround beside the foreground LEDs. Broad background fronts are slower than local LED phases. No new full-screen bright vortex, flame fantasy decoration, invented rainbow, flat black cutout or blank center.
{changes}
'''
            (REVISION/'prompts'/f'{style}-{batch:02}.txt').write_text(prompt,encoding='utf-8')
    print('Saved four source mappings, independently calibrated paths and six spatial-keyframe prompts before API generation.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare'])
    globals()[parser.parse_args().mode]()
