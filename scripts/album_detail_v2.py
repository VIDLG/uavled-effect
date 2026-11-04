"""Full-color background keyframes and fixed, separated emitter microtexture."""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from source_motion import smoothstep, save_image

ROOT=Path('assets/effects/generated-motion-gallery')
REVISION=ROOT/'motion-detail-v2'
STYLES=('styleLava','styleGalaxy','styleNeon')


def configure_foreground(field):
    # A hull is useful for removing generated drone pixels from the background,
    # but must never be the visible foreground mask.
    hull=np.vstack([field.left,field.right,[[200,25],[568,25],[310,445],[458,445]]]).astype(np.int32)
    inside=np.zeros((512,768),np.uint8)
    cv2.fillConvexPoly(inside,cv2.convexHull(hull),1)
    field.protected_hull=inside
    from album_foreground_v3 import restore_emitters
    restore_emitters(field)


def clean_background(field,image):
    # Remove generated drone/carriers before transport. Their pixels can never
    # reappear as a displaced second guard just outside the compositing boundary.
    mask=cv2.dilate(field.protected_hull,np.ones((25,25),np.uint8))*255
    return cv2.inpaint(image,mask,5,cv2.INPAINT_TELEA).astype(np.float32)


def transport(field, rgb, seconds):
    # Slow, forward image-space transport of light structures between generated anchors.
    vx,vy={'styleLava':(-12,15),'styleGalaxy':(-17,-6),'styleNeon':(-22,0)}[field.style]
    return cv2.remap(rgb,(field.x-vx*seconds*field.motion_weight).astype(np.float32),
        (field.y-vy*seconds*field.motion_weight).astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)


def scene_at(field,seconds):
    from motion_gallery import detail_segment
    keys=field.definition['keyframes']
    period=field.definition.get('periodFrames',256)
    position=seconds*30%period
    a,b,t,start,end=detail_segment(keys,position,period)
    left=transport(field,field.rgb_backgrounds[a],(position-start)/30)
    right=transport(field,field.rgb_backgrounds[b],(position-end)/30)
    return left*(1-t)+right*t


def control_scene(field,seconds):
    phase=seconds/(field.definition.get('periodFrames',256)/30)*2*np.pi
    # Periodic travelling deformation changes ridge/filament/line positions, not the drone.
    dx=26*np.sin(phase+field.y/85)
    dy=18*np.cos(phase+field.x/120)
    scene=cv2.remap(field.base,(field.x+dx).astype(np.float32),(field.y+dy).astype(np.float32),
        cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101).astype(np.float32)
    return scene


def prepare():
    from motion_gallery import AlbumField
    for folder in ('controls','references','prompts','raw','before'):
        (REVISION/folder).mkdir(parents=True,exist_ok=True)
    data=json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    mapping={'model':'gpt-image-2.5-flare','styles':list(STYLES),
        'background':'Eight full-RGB generated phases, light structures visibly displaced/deformed; forward transport between anchors, periodic wrap. No extraction to a scalar brightness ratio.',
        'emitters':'Fixed original high-frequency white-core microtexture, dark inter-emitter gaps, narrow halo; no generated strip texture or blur. Source RGB controls color and brightness.',
        'motion':{'styleLava':'Molten tongues and branching hot ridges descend diagonally; distinct crest positions and crack illumination at each phase.',
        'styleGalaxy':'Nebula filaments shift left/up; star clusters change sparkle state and luminous wave-front shape.',
        'styleNeon':'Background scanning lines and reflective streaks move left; strip itself follows actual intermittent color blocks, not an invented chase.'}}
    (REVISION/'rules.json').write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
    for d in data['definitions']:
        style=d['id']
        if style not in STYLES:continue
        field=AlbumField(d,data['styles'][style])
        save_image(Image.fromarray(field.base),REVISION/'references'/f'{style}.png')
        save_image(Image.open(ROOT/'posters'/f'{style}.jpg'),REVISION/'before'/f'{style}.jpg')
        for batch in range(2):
            indices=d['keyframes'][batch*4:batch*4+4]
            grid=Image.new('RGB',(1536,1024))
            for slot,index in enumerate(indices):
                field.control_background=control_scene(field,index/30)
                grid.paste(Image.fromarray(field.render(index/30)),((slot%2)*768,(slot//2)*512))
            save_image(grid,REVISION/'controls'/f'{style}-{batch:02}.png')
            prompt=f'''Edit image 1, a 2x2 motion storyboard. Image 2 fixes drone identity and series finish. Output 1536x1024 with four equal 768x512 panels, no gaps or text.
Source frames {indices}, reading order. LED behavior: {d['rules']}.
PRIMARY CHANGE: background light structures MUST CHANGE POSITION AND SHAPE between panels. Follow the already different background displacement in image 1 and enhance it into clearly readable phases. {mapping['motion'][style]}
Each consecutive panel needs identifiable luminous ridges/filaments/scanning lines displaced by tens of pixels and reshaped, with leading fronts, trailing texture and different small sparkle locations. Keep thematic palette, visual density and album-art style consistent. Do not return four copies with only brightness changes. Background is allowed to deform and travel; only drone geometry is fixed. No new objects or scenery redesign, giant vortex or empty central cutout.
Lock the entire original drone, all four dense guards, camera, exact physical LED paths and neutral exposure. Keep numerous distinct tiny crisp emitter cores with DARK SEPARATIONS, never thick solid neon tubes or smeared color blocks. Do not move the strip outward or blur it. Foreground strip colors/states stay exactly as the source control, while background luminous shapes travel independently. Preserve a narrow quiet contrast region beside the strips.
'''
            (REVISION/'prompts'/f'{style}-{batch:02}.txt').write_text(prompt,encoding='utf-8')
    print('Saved explicit spatial mappings and six background-motion prompts before generation.')


if __name__=='__main__':prepare()
