import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const base=process.argv[2]||'http://localhost:5173';
const points=JSON.parse(execFileSync('python',['-c',`import sys,json,numpy as np;sys.path.insert(0,'scripts');from source_atlas_assets import shared_field;from outer_rim import OuterRim;f=shared_field();r=OuterRim(f);y,x=np.where(r.lip>.999);print(json.dumps({'lip':list(zip(x[::4].tolist(),y[::4].tolist())),'led':[[x-6 if x<384 else x+6,y] for x,y,i in f.emitter_centers]}))`],{encoding:'utf8'}));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/?view=motion&effect=effectStrobe`);
  await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
  const sample=()=>page.locator('canvas').evaluate((c,points)=>{
    const gl=c.getContext('webgl'),p=new Uint8Array(768*512*4);gl.readPixels(0,0,768,512,gl.RGBA,gl.UNSIGNED_BYTE,p);
    return Object.fromEntries(Object.entries(points).map(([name,coords])=>[name,coords.map(([x,y])=>Array.from(p.slice(((511-y)*768+x)*4,((511-y)*768+x)*4+3)))]));
  },points);
  await page.getByRole('button',{name:'跳转至频闪第1个关键画面',exact:true}).click();const on=await sample();
  await page.getByRole('button',{name:'跳转至频闪第4个关键画面',exact:true}).click();const off=await sample();
  assert.deepEqual(on.lip,off.lip,'Guard material must survive source ON/OFF exactly');
  assert(off.lip.every(rgb=>Math.max(...rgb)>30),'The fixed guard must not become a missing black cutout');
  const change=on.led.map((rgb,i)=>Math.max(...rgb)-Math.max(...off.led[i]));assert(change.filter(v=>v>50).length>70,'Original dense bead footprints must still light up at their new outside positions');
  await page.getByRole('button',{name:'选择警灯动效',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
  for(const [key,phase]of[[1,'red'],[4,'blue']]){
    await page.getByRole('button',{name:`跳转至警灯第${key}个关键画面`,exact:true}).click();
    await page.locator('.motion-artwork').screenshot({path:`assets/effects/source-atlas-motion/rim-v4/browser-${phase}.png`});
  }
  assert.deepEqual(errors,[]);
  await writeFile('assets/effects/source-atlas-motion/rim-v4/browser-verification.json',JSON.stringify({base,guardSamples:points.lip.length,guardOnOffMaxError:0,activeOriginalBeads:change.filter(v=>v>50).length,errors},null,2)+'\n');
  console.log('PASS: fixed outer rim across ON/OFF, original bead density at outside positions');
}finally{await browser.close();}
