import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.argv[2]||'http://localhost:4173';
const catalog=JSON.parse(await readFile('assets/effects/source-atlas-motion/index.json','utf8'));
const folder='tmp/motion-gallery';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results={base,effects:[],errors:[],failedRequests:[]};
const snapshot=async page=>page.locator('.motion-artwork canvas').evaluate(canvas=>{
  const gl=canvas.getContext('webgl'),pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  // Neutral central body is wholly outside animated strip/background masks.
  const body=[];for(let y=140;y<370;y+=10)for(let x=350;x<410;x+=10){let i=(y*canvas.width+x)*4;body.push(...pixels.slice(i,i+3));}
  let checksum=0;for(let i=0;i<pixels.length;i++)checksum=(Math.imul(checksum,31)+pixels[i])|0;
  return{checksum,body};
});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1080}});
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)results.failedRequests.push({url:r.url(),status:r.status()});});
  const textures=new Set();page.on('request',r=>{if(r.resourceType()==='image'&&/\.png/.test(r.url()))textures.add(r.url());});
  await page.goto(`${base}/?view=motion&effect=effectSolid`);
  await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.motion-track').count(),56);
  results.initialTextureCount=textures.size;
  assert(textures.size<=6,'Only the selected source textures should load, not all functions');
  for(const effect of catalog.effects){
    await page.getByRole('button',{name:`选择${effect.label}动效`,exact:true}).click();
    await page.getByRole('heading',{name:effect.label,exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
    assert.equal(await page.locator('[role=alert]').count(),0,effect.id);
    assert.equal(await page.locator('canvas').count(),1);
    assert.equal(await page.locator('video').count(),0);
    const play=page.getByRole('button',{name:'播放动效',exact:true});
    if(effect.isStatic){
      assert(await play.isDisabled());const first=await snapshot(page);await page.waitForTimeout(350);assert.deepEqual(await snapshot(page),first);
      results.effects.push({id:effect.id,static:true});continue;
    }
    await page.getByRole('button',{name:'暂停动效',exact:true}).click();
    await page.getByRole('button',{name:`跳转至${effect.label}第1个关键画面`,exact:true}).click();
    const first=await snapshot(page);
    await page.getByRole('button',{name:`跳转至${effect.label}第4个关键画面`,exact:true}).click();
    const fourth=await snapshot(page);
    assert.deepEqual(fourth.body,first.body,`${effect.id}: neutral drone must stay fixed`);
    // Coincident endpoints can occur in periodic source patterns. Find another
    // supplied anchor before accepting an apparently static dynamic function.
    let changed=fourth.checksum!==first.checksum;
    if(!changed){await page.getByRole('button',{name:`跳转至${effect.label}第2个关键画面`,exact:true}).click();changed=(await snapshot(page)).checksum!==first.checksum;}
    assert(changed,`${effect.id}: source phases must produce visible changes`);
    const frozen=await snapshot(page);await page.waitForTimeout(50);assert.deepEqual(await snapshot(page),frozen);
    await page.getByRole('button',{name:`跳转至${effect.label}第1个关键画面`,exact:true}).click();await play.click();
    await page.waitForFunction(()=>Number(document.querySelector('.motion-seek').value)>.04);
    results.effects.push({id:effect.id,pause:true,seek:true,neutralFixed:true,visibleChange:true});
    if(['effectChase','effectMeteor','effectPulse','effectColorSparkle','stylePolice','effectBreathe'].includes(effect.id))await page.screenshot({path:`${folder}/${effect.id}-source-atlas.png`});
    if(results.effects.length%10===0)console.log(`Verified ${results.effects.length}/46 source albums`);
  }
  // One-shot source fade must finish and hold rather than reversing or looping.
  await page.getByRole('button',{name:'选择淡入淡出动效',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
  await page.getByRole('button',{name:'暂停动效',exact:true}).click();
  const slider=page.getByRole('slider',{name:'动效播放进度'});await slider.focus();await slider.press('End');
  await page.getByRole('button',{name:'播放动效',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('.motion-seek').value)>.1);
  await page.waitForFunction(()=>Number(document.querySelector('.motion-seek').value)===4,{},{timeout:6000});
  assert(await page.getByRole('button',{name:'播放动效',exact:true}).isEnabled());const held=await snapshot(page);await page.waitForTimeout(200);assert.deepEqual(await snapshot(page),held);results.oneShotEndsAndReplays=true;
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,reducedMotion:'reduce'}),phone=await mobile.newPage();
  await phone.goto(`${base}/?view=motion&effect=effectColorSparkle`);
  await phone.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
  assert(await phone.getByRole('button',{name:'播放动效',exact:true}).isEnabled());
  const stable=await snapshot(phone);await phone.waitForTimeout(150);assert.deepEqual(await snapshot(phone),stable);
  await phone.getByRole('button',{name:'播放动效',exact:true}).click();await phone.waitForFunction(()=>Number(document.querySelector('.motion-seek').value)>.05);
  results.mobile=await phone.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert(results.mobile.width<=results.mobile.viewport);
  await phone.screenshot({path:`${folder}/source-atlas-mobile.png`,fullPage:true});
  await phone.getByRole('button',{name:'特效库',exact:true}).click();assert.equal(await phone.locator('.motion-artwork canvas').count(),0);results.rendererReleasedOnLeave=true;
  assert.deepEqual(results.errors,[]);assert.deepEqual(results.failedRequests,[]);
  await writeFile(`${folder}/source-atlas-browser-verification.json`,JSON.stringify(results,null,2));console.log(`PASS ${results.effects.length} albums, static/one-shot/mobile/reduced motion; no browser errors`);
}finally{await browser.close();}
