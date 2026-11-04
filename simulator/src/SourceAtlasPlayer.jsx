import React,{useEffect,useRef,useState} from "react";
import MotionControls from "./MotionControls.jsx";
import {createSourceAtlasRenderer} from "./sourceAtlasMotion.js";

export default function SourceAtlasPlayer({effect,onPrevious,onNext}){
  const canvas=useRef(null),renderer=useRef(null),cursor=useRef(0);
  const [playing,setPlaying]=useState(()=>!effect.isStatic&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready,setReady]=useState(false),[error,setError]=useState(""),[time,setTime]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    createSourceAtlasRenderer(canvas.current,effect).then(instance=>{
      if(cancelled){instance.dispose();return;}renderer.current=instance;instance.render(0);setReady(true);
    }).catch(()=>{if(!cancelled)setError("这段灯效暂时无法载入，请重新选择后再试。");});
    return()=>{cancelled=true;renderer.current?.dispose();renderer.current=null;};
  },[effect]);
  useEffect(()=>{
    if(!ready||!playing||effect.isStatic)return;
    let frame,previous=0,lastUi=0;
    const tick=now=>{
      if(!document.hidden){
        if(previous)cursor.current+=(now-previous)/1000;previous=now;
        if(effect.oneShot&&cursor.current>=effect.duration){cursor.current=effect.duration;renderer.current.render(cursor.current);setTime(cursor.current);setPlaying(false);return;}
        if(!effect.oneShot)cursor.current%=effect.duration;
        renderer.current.render(cursor.current);
        if(now-lastUi>100){setTime(cursor.current);lastUi=now;}
      }else previous=0;
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[ready,playing,effect]);
  const seek=value=>{cursor.current=Math.max(0,Math.min(value,effect.duration));setTime(cursor.current);renderer.current?.render(cursor.current);};
  const toggle=()=>{if(effect.oneShot&&cursor.current>=effect.duration)seek(0);setPlaying(v=>!v);};
  return <section className="motion-player" aria-label={`${effect.label}动效播放器`}>
    <div className="motion-artwork" aria-busy={!ready&&!error}>
      <canvas ref={canvas} width="768" height="512" role="img" aria-label={`${effect.label}${effect.isStatic?"常亮画面":"实时动效"}`} />
      {!ready&&!error&&<span className="motion-loading">正在载入灯效</span>}
      {error&&<div className="motion-media-message" role="alert">{error}</div>}
    </div>
    <MotionControls effect={effect} playing={playing&&ready} ready={ready} time={time} duration={effect.duration}
      onPrevious={onPrevious} onNext={onNext} onToggle={toggle} onSeek={seek}/>
    {!effect.isStatic&&<><div className="motion-keyframe-heading"><strong>关键画面</strong><span>点击跳转到这一刻</span></div>
      <div className="motion-keyframes">{effect.keyframes.map((key,index)=><button key={index} type="button" disabled={!ready} onClick={()=>seek(key.time)} aria-label={`跳转至${effect.label}第${index+1}个关键画面`}>
        <img src={key.image} alt={`${effect.label}关键画面 ${index+1}`} loading="lazy" decoding="async"/><span>{key.time.toFixed(2)} s</span>
      </button>)}</div></>}
  </section>;
}
