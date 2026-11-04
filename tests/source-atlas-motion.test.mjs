import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourcePosition,sampleSource,lightPixel} from '../simulator/src/sourceAtlasMotion.js';
import {simulateFrames} from '../simulator/src/simulate.js';

const root='assets/effects/source-atlas-motion/';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const mapping=read(root+'mapping.json'),catalog=read(root+'index.json');
test('all 56 source functions have one selected album, and solid remains static',()=>{
  const manifest=read('manifest.json');
  const expected=manifest.prelude.filter(p=>/^(effects|styles)\//.test(p)).map(p=>p.split('/').at(-1).replace('.js',''));
  const selected=[...read('assets/effects/generated-motion-gallery/index.json').effects.map(e=>e.id),'effectRainbow',...catalog.effects.map(e=>e.id)];
  assert.deepEqual([...selected].sort(),expected.sort());
  assert.equal(new Set(selected).size,56);
  assert.deepEqual(catalog.effects.filter(e=>e.isStatic).map(e=>e.id),['effectSolid']);
  for(const e of catalog.effects)for(const p of [e.scene,e.sourceTexture,e.zones,e.poster,...e.keyframes.map(k=>k.image),...(e.backgroundAtlas?[e.backgroundAtlas]:[])]) assert(existsSync(root+p),p);
});
test('cached RGB is tied to current source, and deterministic snapshots match native execution',()=>{
  const prelude=readFileSync('dist/prelude.js','utf8');
  const sha=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
  for(const d of mapping.effects){
    const t=read(root+d.trace);
    assert.equal(t.sourceSha256,sha(readFileSync(d.source,'utf8')),d.id);
    assert.equal(t.preludeSha256,sha(prelude),d.id);
    assert.equal(t.frames.length,d.periodFrames);
    assert(t.frames.every(f=>f.length===40&&f.every(rgb=>rgb.length===3&&rgb.every(c=>c>=0&&c<=255))),d.id);
  }
  for(const id of ['stylePolice','effectSolid','effectChase','effectFade','effectBreathe','effectFire','effectIceFire','effectSparkle']){
    const d=mapping.effects.find(e=>e.id===id);
    assert.deepEqual(read(root+d.trace).frames,simulateFrames(prelude,d.call,d.periodFrames+d.warmupFrames,40).slice(d.warmupFrames),id);
  }
});
test('settled fire loops avoid replaying an empty cold start',()=>{
  for(const id of ['effectFire','effectIceFire']){
    const d=mapping.effects.find(e=>e.id===id),f=read(root+d.trace).frames;
    assert.equal(d.warmupFrames,256);
    const gap=f[0].flat().reduce((s,v,i)=>s+Math.abs(v-f.at(-1).flat()[i]),0)/120;
    assert(gap<10,`${id}: heat-field loop seam ${gap}`);
  }
});
test('time advances forwards, loops or ends according to source policy',()=>{
  const loop={periodFrames:120};
  assert.equal(sourcePosition(.1,loop),3);assert.equal(sourcePosition(4,loop),0);
  assert.equal(sourcePosition(12,{...loop,oneShot:true}),119);
  assert.equal(sourcePosition(12,{...loop,isStatic:true}),0);
  assert.deepEqual(sampleSource([[[255,0,0]],[[0,0,255]]],.25),[[191.25,0,63.75]]);
});
test('original white cores and colored profiles survive replacement; off really turns off',()=>{
  assert.deepEqual(lightPixel(255,200,[0,255,0],255),[250,255,250]);
  assert.deepEqual(lightPixel(100,0,[0,255,0],255),[0,125,0]);
  assert.deepEqual(lightPixel(255,200,[0,0,0],255),[0,0,0]);
  const full=lightPixel(150,80,[255,0,0],255),dim=lightPixel(150,80,[63.75,0,0],255);
  assert.deepEqual(dim,full.map(x=>x*.5));
});
