from pathlib import Path
import hashlib,json,math
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent
plan=json.loads((root/'generation.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
valid=[]
for r in plan['requests']:
 p=root/r['output']
 if not p.exists():continue
 im=Image.open(p).convert('RGB'); assert im.width==im.height and im.width>=1024
 r['dimensions']=list(im.size);r['outputSha256']=hashlib.sha256(p.read_bytes()).hexdigest();r['promptSha256']=hashlib.sha256((root/r['prompt']).read_bytes()).hexdigest();valid.append((r,im))
cols=5;tile=300;gap=16;caption=48;rows=math.ceil(len(valid)/cols)
sheet=Image.new('RGB',(gap+cols*(tile+gap),gap+rows*(tile+caption+gap)),'#111715');draw=ImageDraw.Draw(sheet)
for i,(r,im) in enumerate(valid):
 x=gap+(i%cols)*(tile+gap);y=gap+(i//cols)*(tile+caption+gap);sheet.paste(im.resize((tile,tile),Image.Resampling.LANCZOS),(x,y));draw.text((x+3,y+tile+5),r['label'],font=font,fill='#ecf2ed');draw.text((x+tile-3,y+tile+29),r['storyTitle'],font=small,fill='#9fb1a6',anchor='ra')
plan['generatedCount']=len(valid);plan['missingIds']=[r['id'] for r in plan['requests'] if not (root/r['output']).exists()]
(root/'generation.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');sheet.save(root/'theme-mechanism-contact-sheet.jpg',quality=92);print('contact',len(valid),'missing',len(plan['missingIds']))
