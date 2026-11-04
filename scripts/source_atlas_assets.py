"""Prepare shared approved emitter geometry, source RGB atlases and motion controls."""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from motion_gallery import AlbumField, ROOT as GALLERY
from album_detail_v2 import clean_background
from album_foreground_v3 import light_layer, background as grade_background
from source_motion import replace_regions, smoothstep, save_image

ROOT = Path('assets/effects/source-atlas-motion')


def shared_field():
    data = json.loads((GALLERY/'source-frames.json').read_text(encoding='utf-8'))
    definition = next(d for d in data['definitions'] if d['id']=='styleNeon')
    return AlbumField(definition, data['styles']['styleNeon'])


def zones(scene, frames, reference):
    rgb = scene.astype(np.float32)
    chroma = rgb-rgb.min(axis=2, keepdims=True)
    hue = chroma/np.maximum(chroma.max(axis=2, keepdims=True), 1)
    # A representative source color per logical region includes colors absent in
    # this particular reference instant (e.g. the OFF blue half of Police).
    maxima = frames.max(axis=2).argmax(axis=0)
    palette = frames[maxima, np.arange(40)].astype(np.float32)
    palette -= palette.min(axis=1, keepdims=True)
    palette /= np.maximum(palette.max(axis=1, keepdims=True), 1)
    unique = np.unique(np.round(palette*5), axis=0)
    yy, xx = np.indices(scene.shape[:2])
    if len(unique)<4:
        if len(unique)==2 and np.linalg.norm(unique[0]-unique[1])>3:
            first = np.argmin(np.sum((hue[...,None,:]-palette[None,None,:,:])**2, axis=3),axis=2)
            return first.astype(np.uint8)
        return np.floor((xx/768*.65+yy/512*.8)*39).astype(np.uint8)%40
    return np.argmin(np.sum((hue[...,None,:]-palette[None,None,:,:])**2, axis=3),axis=2).astype(np.uint8)


def moving_scene(field, scene, seconds, definition):
    progress = seconds/max(definition['duration'], .01)
    if definition['id'] in ('effectPulse','effectCenterExpand','effectCenterContract','effectDampedRebound','effectTendril','effectDirectionalTendril'):
        direction = -1 if definition['id']=='effectCenterContract' else 1
        scale = 1+direction*.22*progress
        x = 384+(field.x-384)/scale
        y = 256+(field.y-256)/scale
    else:
        direction = 1
        if definition['id'] in ('effectBounce','effectBounceTail','effectScanner'):
            progress = 1-abs(1-progress*2)
        x, y = field.x-45*progress*direction, field.y-65*progress*direction
    return cv2.remap(scene, x.astype(np.float32), y.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)


def mapped_background(scene, frames, coordinate, index, spatial=False):
    source = frames[index][coordinate]
    peak = max(float(frames.max()),1)
    level = source.max(axis=2,keepdims=True)
    hue = source/np.maximum(level,1)
    rgb = scene.astype(np.float32)
    minimum = rgb.min(axis=2,keepdims=True)
    shade = minimum+(rgb.max(axis=2,keepdims=True)-minimum)*hue
    response = np.sqrt(level/peak)
    if spatial:
        response = .20+.80*response
    return shade*response


def compose(field, background, colors):
    output = replace_regions(field.neutral, background, field.background_mask)
    return replace_regions(output, light_layer(field, colors), field.band_mask)


def prepare():
    mapping = json.loads((ROOT/'mapping.json').read_text(encoding='utf-8'))
    for name in ('shared','scenes','sources','zones','posters','keyframes','controls','references','prompts','raw'):
        (ROOT/name).mkdir(parents=True,exist_ok=True)
    field = shared_field()
    value = np.round(field.base.astype(np.float32)@np.array([.2126,.7152,.0722])).astype(np.uint8)
    field.neutral = np.repeat(value[...,None],3,axis=2)
    save_image(Image.fromarray(field.neutral),ROOT/'shared/drone.png')
    profile = np.dstack([np.round(field.emitter_coordinate*255/39),np.round(field.coordinate*255/39),field.base.max(axis=2),field.base.min(axis=2)]).astype(np.uint8)
    masks = np.dstack([field.material_matte,field.band_mask,smoothstep(3,36,field.distance),field.motion_weight])
    save_image(Image.fromarray(profile),ROOT/'shared/profile.png')
    save_image(Image.fromarray(np.round(masks*255).astype(np.uint8)),ROOT/'shared/masks.png')
    catalog = []
    for d in mapping['effects']:
        trace = json.loads((ROOT/d['trace']).read_text(encoding='utf-8'))
        frames = np.asarray(trace['frames'],np.float32)
        field.frames = frames
        scene = np.asarray(Image.open(d['reference']).convert('RGB').resize((768,512),Image.Resampling.LANCZOS))
        scene = np.round(clean_background(field,scene)).astype(np.uint8)
        coordinate = zones(scene,frames,d['referenceFrame'])
        save_image(Image.fromarray(scene),ROOT/'scenes'/f"{d['id']}.png")
        save_image(Image.fromarray(frames.astype(np.uint8)),ROOT/'sources'/f"{d['id']}.png")
        save_image(Image.fromarray(coordinate),ROOT/'zones'/f"{d['id']}.png")
        # This reference is the composed canonical drone + this function's scene.
        first_bg = grade_background(field,mapped_background(scene,frames,coordinate,d['referenceFrame'],d['generated']),0,d['duration'])
        reference = compose(field,first_bg,frames[d['referenceFrame']])
        save_image(Image.fromarray(reference),ROOT/'references'/f"{d['id']}.png")
        grid = Image.new('RGB',(1536,1024))
        thumbnails = []
        for slot,index in enumerate(d['keyframes']):
            bg = moving_scene(field,scene,index/30,d) if d['generated'] else scene
            rgb = grade_background(field,mapped_background(bg,frames,coordinate,index,d['generated']),index/30,d['duration'])
            frame = compose(field,rgb,frames[index])
            grid.paste(Image.fromarray(frame),((slot%2)*768,(slot//2)*512))
            path=f"keyframes/{d['id']}-{slot}.jpg"
            save_image(Image.fromarray(frame).resize((384,256),Image.Resampling.LANCZOS),ROOT/path,quality=90)
            thumbnails.append({'time':index/30,'sourceFrame':index,'image':path})
        if d['generated']:
            save_image(grid,ROOT/'controls'/f"{d['id']}.png")
            key_summary = []
            for index in d['keyframes']:
                active = np.flatnonzero(frames[index].max(axis=1)>max(d['peak']*.4,8)).tolist()
                key_summary.append({'frame':index,'brightLogicalIndices':active})
            prompt=f'''Use case: compositing. Edit image 1, a 2x2 animation storyboard; image 2 is the exact series/foreground reference. Output 1536x1024, four equal 768x512 panels, no gutters, labels or text.
Function {d['id']}, source call {d['call']}. ACTUAL captured source states at 30 FPS: {json.dumps(key_summary)}. Behavior: {d['behavior']}
Keep the approved SAME neutral drone, four dense propeller guards, camera, size, exact position and viewpoint. The many white LED core footprints and TWO fixed outer S strips must stay the exact size/positions shown in image 1. Do not turn them into tiny dots, solid colored tubes, isolated floating strips or new rings. Do not change the light occupancy/colors supplied in each panel. Native source RGB takes precedence over a title or comment.
PRIMARY EDIT IS THE OUTER BACKGROUND LIGHT MOTION. Each panel MUST show an identifiable luminous head/front/wake in a DIFFERENT LOCATION and action phase. Follow the already displaced background structures and the differing source positions in image 1. Make the changes clear at thumbnail size: tens of pixels of travel, different leading-front positions and trailing structure. Do not return four near-identical pictures with only texture/brightness changes. Preserve the original composed album-art scenery and palette from image 2; refine the source-controlled light structures inside that scene, not a new scene. Traveling fronts advance consistently; only actual bounce/rebound functions reverse direction.
Keep a NATURAL SOFT transition at the drone boundary. No uniform dark collar, opaque side plate, wing extension, central cutout, hard polygon edge or bright ribbon hugging and hiding the physical LEDs. Background contrasts stay below the foreground cores. Do not redesign the drone, displace the camera, add logos or change illustration finish.
'''
            if d.get('warmupFrames',0):
                prompt+=f"These are settled source states after {d['warmupFrames']} native warm-up frames. Preserve the lit settled heat field; do not add a cold-start blackout between cycles.\n"
            (ROOT/'prompts'/f"{d['id']}.txt").write_text(prompt,encoding='utf-8')
        hero = int(np.argmax(frames.max(axis=2).sum(axis=1)))
        bg = grade_background(field,mapped_background(scene,frames,coordinate,hero,d['generated']),hero/30,d['duration'])
        save_image(Image.fromarray(compose(field,bg,frames[hero])),ROOT/'posters'/f"{d['id']}.jpg",quality=91)
        candidates = frames.reshape(-1,3);candidates=candidates[candidates.max(axis=1)>max(d['peak']*.5,10)]
        colors,counts=np.unique((np.round(candidates/32)*32).clip(0,255).astype(np.uint8),axis=0,return_counts=True)
        palette=['#'+''.join(f'{int(v):02x}' for v in c) for c in colors[np.argsort(counts)[-3:][::-1]]]
        description = ('整条灯带保持常亮，颜色与亮度稳定。' if d['isStatic'] else '光按既定方向变化，结束后停留，可重新播放。' if d['oneShot'] else '整条灯带同步明暗变化。' if d['uniform'] else '灯带持续点亮，分段色彩沿轮廓变化。' if d['fullLit'] else '光点沿灯带变化，背景光纹与节奏呼应。')
        catalog.append({k:d[k] for k in ('id','label','duration','periodFrames','peak','isStatic','oneShot','uniform','fullLit','generated','policy','keyframes')})
        catalog[-1].update({'kind':'source-atlas','description':description,'palette':palette,'keyframes':thumbnails,
            'scene':f"scenes/{d['id']}.png",'sourceTexture':f"sources/{d['id']}.png",'zones':f"zones/{d['id']}.png",'poster':f"posters/{d['id']}.jpg",
            'backgroundAtlas':f"backgrounds/{d['id']}.png" if d['generated'] else None})
        print(d['id'],d['policy'],flush=True)
    (ROOT/'index.json').write_text(json.dumps({'shared':{'base':'shared/drone.png','profile':'shared/profile.png','masks':'shared/masks.png'},'effects':catalog},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    requests=[]
    for d in mapping['effects']:
        if not d['generated']:continue
        images=[f"controls/{d['id']}.png",f"references/{d['id']}.png"]
        requests.append({'id':d['id'],'images':images,'inputSha256':[hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in images],
                         'prompt':f"prompts/{d['id']}.txt",'promptSha256':hashlib.sha256((ROOT/'prompts'/f"{d['id']}.txt").read_bytes()).hexdigest(),
                         'output':f"raw/{d['id']}.png",'sourceFrames':d['keyframes'],'warmupFrames':d.get('warmupFrames',0)})
    (ROOT/'generation-plan.json').write_text(json.dumps({'model':'gpt-image-2.5-flare','operation':'images.edit','quality':'high','size':'1536x1024','requests':requests},indent=2)+'\n',encoding='utf-8')


def finish():
    (ROOT/'backgrounds').mkdir(exist_ok=True)
    field=shared_field()
    field.neutral=np.asarray(Image.open(ROOT/'shared/drone.png').convert('RGB'))
    mapping=json.loads((ROOT/'mapping.json').read_text(encoding='utf-8'))
    definitions={d['id']:d for d in mapping['effects']}
    plan=json.loads((ROOT/'generation-plan.json').read_text(encoding='utf-8'))
    for request in plan['requests']:
        source=ROOT/request['output']
        if not source.exists():raise ValueError(f'Missing generated sequence: {source}')
        raw=np.asarray(Image.open(source).convert('RGB'))
        if raw.shape!=(1024,1536,3):raise ValueError(f'Invalid storyboard dimensions: {source}')
        atlas=Image.new('RGB',(1536,1024))
        for slot in range(4):
            x,y=slot%2*768,slot//2*512
            background=np.round(clean_background(field,raw[y:y+512,x:x+768])).astype(np.uint8)
            atlas.paste(Image.fromarray(background),(x,y))
        save_image(atlas,ROOT/'backgrounds'/f"{request['id']}.png")
        d=definitions[request['id']]
        frames=np.asarray(json.loads((ROOT/d['trace']).read_text(encoding='utf-8'))['frames'],np.float32)
        field.frames=frames
        # Thumbnails depict the actual generated background at each source anchor.
        # Keep the original fixed drone and emitter profiles, never generated ones.
        ceiling=(75+105*smoothstep(3,36,field.distance))[...,None]
        previews=[]
        for slot,index in enumerate(d['keyframes']):
            x,y=slot%2*768,slot//2*512
            bg=np.asarray(atlas)[y:y+512,x:x+768].astype(np.float32)
            bg*=np.minimum(1,ceiling/np.maximum(bg.max(axis=2,keepdims=True),1))
            preview=Image.fromarray(compose(field,bg,frames[index]))
            previews.append(preview)
            save_image(preview.resize((384,256),Image.Resampling.LANCZOS),ROOT/'keyframes'/f"{d['id']}-{slot}.jpg",quality=90)
        hero=int(np.argmax([frames[i].max(axis=1).sum() for i in d['keyframes']]))
        save_image(previews[hero],ROOT/'posters'/f"{d['id']}.jpg",quality=91)
        request['outputSha256']=hashlib.sha256(source.read_bytes()).hexdigest()
        assert hashlib.sha256((ROOT/request['prompt']).read_bytes()).hexdigest()==request['promptSha256']
        for p,digest in zip(request['images'],request['inputSha256']):
            assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==digest
    (ROOT/'generation.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
    print('Processed and verified all generated background phases; original drone and emitters are composed separately.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','finish']);globals()[parser.parse_args().mode]()
