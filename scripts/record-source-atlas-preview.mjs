import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const base=process.argv[2]||'http://localhost:4173';
const root='assets/effects/source-atlas-motion';
const catalog=JSON.parse(await readFile(`${root}/index.json`,'utf8'));
await mkdir(`${root}/previews`,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const evidence=[];
try{
  for(const [id,seconds] of [['effectChase',6],['effectColorSparkle',5],['effectFire',10]]){
    const effect=catalog.effects.find(e=>e.id===id);
    const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
    await page.addInitScript(()=>{
      window.albumDrawTimes=[];
      const draw=WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays=function(...args){
        if(this.canvas.matches('.motion-artwork canvas'))window.albumDrawTimes.push(performance.now());
        return draw.apply(this,args);
      };
    });
    await page.goto(`${base}/?view=motion&effect=${id}`);
    await page.waitForFunction(()=>document.querySelector('.motion-artwork')?.getAttribute('aria-busy')==='false');
    await page.evaluate(()=>{
      const stream=document.querySelector('.motion-artwork canvas').captureStream(60);
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5500000});
      window.albumRecording=new Promise(resolve=>{
        const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=async()=>{
          const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());
          let encoded='';for(let i=0;i<bytes.length;i+=0x8000)encoded+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
          stream.getTracks().forEach(t=>t.stop());resolve(btoa(encoded));
        };
      });
      window.albumRecorder=recorder;window.albumDrawTimes=[];recorder.start(200);
    });
    await page.getByRole('button',{name:'播放动效',exact:true}).click();
    await page.waitForTimeout(seconds*1000);
    const captured=await page.evaluate(async()=>{
      window.albumRecorder.stop();const data=await window.albumRecording;
      const times=window.albumDrawTimes,elapsed=times.at(-1)-times[0];
      const intervals=times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b);
      return{data,draws:times.length,observedFps:(times.length-1)*1000/elapsed,p95IntervalMs:intervals[Math.floor(intervals.length*.95)]};
    });
    const intermediate=`tmp/motion-gallery/${id}-source-atlas.webm`,output=`${root}/previews/${id}.mp4`;
    await writeFile(intermediate,Buffer.from(captured.data,'base64'));
    const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',intermediate,'-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',output],{encoding:'utf8'});
    if(result.status!==0)throw new Error(result.stderr||'ffmpeg failed');
    delete captured.data;evidence.push({id,label:effect.label,seconds,output,...captured});
    console.log(id,captured.observedFps.toFixed(1),'draws/s');await page.close();
  }
  await writeFile(`${root}/previews/capture.json`,JSON.stringify({base,browser:'Headless Microsoft Edge on Windows; desktop evidence, not phone acceptance',effects:evidence},null,2)+'\n');
}finally{await browser.close();}
