"""Versioned outer-rim correction; generated references and source RGB stay intact."""
import argparse,json,subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from source_atlas_assets import shared_field
from source_motion import MotionField,save_image,replace_regions,smoothstep
from outer_rim import OuterRim

ROOT=Path('assets/effects/source-atlas-motion')
GALLERY=Path('assets/effects/generated-motion-gallery')
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def previews(root,e,r):
    for k in e.get('keyframes',[]):
        if '-rim-v6' in k['image']:continue
        p=Path(k['image']);out=p.with_stem(p.stem+'-rim-v6')
        im=np.asarray(Image.open(root/p).convert('RGB').resize((768,512),Image.Resampling.LANCZOS))
        save_image(Image.fromarray(r.frame(im)).resize((384,256),Image.Resampling.LANCZOS),root/out,quality=90)
        k['image']=out.as_posix()
    if '-rim-v6' not in e['poster']:
        p=Path(e['poster']);out=p.with_stem(p.stem+'-rim-v6')
        im=np.asarray(Image.open(root/p).convert('RGB').resize((768,512),Image.Resampling.LANCZOS))
        save_image(Image.fromarray(r.frame(im)),root/out,quality=92);e['poster']=out.as_posix()

def atlas():
    f=shared_field();r=OuterRim(f);j=read(ROOT/'rim-v5/original-catalogs.json')['atlas']
    original=np.asarray(Image.open(ROOT/'shared/masks.png')).copy()
    original[...,0]=np.round(r.body_mask*255).astype(np.uint8)
    original[...,1]=np.round(r.band*255).astype(np.uint8)
    save_image(Image.fromarray(r.body),ROOT/'shared/rim-drone-v6.png')
    save_image(Image.fromarray(r.shift(np.asarray(Image.open(ROOT/'shared/profile.png')),True)),ROOT/'shared/rim-profile-v6.png')
    save_image(Image.fromarray(original),ROOT/'shared/rim-masks-v6.png')
    j['shared']={'base':'shared/rim-drone-v6.png','profile':'shared/rim-profile-v6.png','masks':'shared/rim-masks-v6.png'}
    for e in j['effects']:previews(ROOT,e,r)
    j['geometryRevision']='outer-rim-v6';write(ROOT/'index.json',j)
    folder=ROOT/'rim-v6';folder.mkdir(exist_ok=True)
    off=replace_regions(np.full_like(f.base,24),r.body,r.body_mask)
    carrier=smoothstep(170,220,r.shift(f.base.min(axis=2)))
    off=replace_regions(off,np.zeros_like(off),r.band*carrier)
    on=replace_regions(replace_regions(np.full_like(f.base,24),r.body,r.body_mask),r.shift(f.base),r.band)
    save_image(Image.fromarray(np.hstack([off,on])),folder/'off-on.png')
    write(folder/'geometry.json',{'revision':'outer-rim-v6','shiftOutwardsPixels':6,'lipLightMaskOverlapMax':float((r.band*r.lip).max()),'oldEmitterCount':len(f.emitter_centers),'newEmitterCount':len(f.emitter_centers),'guardConnectedToBody':True,'changes':'Bounded AI neutral perimeter repair extending beyond LED endpoints into original upper/lower molded joins. Original central drone pixels, dense emitter profile and native RGB timing retained. No copied parallel rail.'})
    print('Updated 46 live album foregrounds and previews.',flush=True)

def videos(style=None):
    from motion_gallery import AlbumField
    data=read(GALLERY/'source-frames.json');j=read(ROOT/'rim-v5/original-catalogs.json')['videos'];outdir=GALLERY/'rim-v6';outdir.mkdir(exist_ok=True)
    if style and style not in {e['id'] for e in j['effects']}:
        raise ValueError(f'Unknown video style: {style}')
    for e in j['effects']:
        if style and e['id']!=style:continue
        if e.get('revision')=='outer-rim-v6':continue
        d=next(d for d in data['definitions'] if d['id']==e['id'])
        f=AlbumField(d,data['styles'][e['id']]);r=OuterRim(f)
        source=GALLERY/e['video'];output=outdir/(e['id']+'-loop.mp4')
        temporary=output.with_name('.'+output.stem+'.tmp.mp4')
        cap=cv2.VideoCapture(str(source));fps=cap.get(cv2.CAP_PROP_FPS)
        enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','768x512','-r',str(fps),'-i','-','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(temporary)],stdin=subprocess.PIPE)
        carrier=smoothstep(170,220,r.shift(f.base.min(axis=2)))
        while True:
            ok,frame=cap.read()
            if not ok:break
            frame=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB);shifted=r.shift(frame)
            restored=r.restore(frame)
            opacity=r.band*np.maximum(carrier,smoothstep(0,100,shifted.max(axis=2)))
            enc.stdin.write(replace_regions(restored,shifted,opacity).tobytes())
        cap.release();enc.stdin.close()
        if enc.wait():raise RuntimeError(e['id'])
        temporary.replace(output)
        previews(GALLERY,e,r);e['video']=output.relative_to(GALLERY).as_posix();e['revision']='outer-rim-v6'
        print('Corrected video',e['id'],flush=True)
    if style:
        selected=read(GALLERY/'index.json')
        changed=next(e for e in j['effects'] if e['id']==style)
        selected['effects']=[changed if e['id']==style else e for e in selected['effects']]
        j=selected
    write(GALLERY/'index.json',j)

def rainbow():
    root=Path('assets/effects/single-image-motion');j=read(ROOT/'rim-v5/original-catalogs.json')['rainbow']
    if j.get('geometryRevision')=='outer-rim-v6':return
    cal=read(root/'calibration.json');base=np.asarray(Image.open(root/j['base']).convert('RGB'))
    f=MotionField('effectRainbow',np.zeros((1,40,3),np.float32),base=base,paths=(np.asarray(cal['left']),np.asarray(cal['right'])))
    r=OuterRim(f);field=np.asarray(Image.open(root/j['map'])).copy();shifted=r.shift(field,True)
    newbase=r.frame(base);newfield=field.copy();newfield[...,2]=np.round(field[...,2]*(1-r.lip)).astype(np.uint8)
    use=r.band>.01;newfield[use]=shifted[use]
    for key,im in [('base',newbase),('map',newfield)]:
        p=Path(j[key]);out=p.with_stem(p.stem+'-rim-v6');save_image(Image.fromarray(im),root/out);j[key]=out.as_posix()
    save_image(Image.fromarray(newbase),root/'effectRainbow-rim-v6-poster.jpg',quality=92)
    j['poster']='effectRainbow-rim-v6-poster.jpg';j['geometryRevision']='outer-rim-v6';write(root/'index.json',j)
    print('Corrected Rainbow artwork and field.',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['atlas','videos','rainbow'])
    p.add_argument('--style',help='Re-export one historical video from its original inputs')
    args=p.parse_args()
    if args.style and args.mode!='videos':p.error('--style is only valid for videos')
    if args.mode=='videos':videos(args.style)
    else:globals()[args.mode]()
