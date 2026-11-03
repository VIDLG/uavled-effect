import React, { useEffect, useRef, useState } from "react";
import MotionControls from "./MotionControls.jsx";
import { createSingleImageRenderer } from "./singleImageMotion.js";

export default function SingleImagePlayer({ effect, onPrevious, onNext }) {
  const canvas = useRef(null), renderer = useRef(null), cursor = useRef(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [time, setTime] = useState(0), [original, setOriginal] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createSingleImageRenderer(canvas.current, effect).then((instance) => {
      if (cancelled) { instance.dispose(); return; }
      renderer.current = instance;
      instance.render(0);
      setReady(true);
    }).catch(() => { if (!cancelled) setError("此浏览器暂时无法播放这段动效"); });
    return () => { cancelled = true; renderer.current?.dispose(); renderer.current = null; };
  }, [effect]);

  useEffect(() => {
    if (!ready) return;
    renderer.current.render(cursor.current, original);
    if (!playing || original) return;
    let frame, previous = 0, lastUi = 0;
    const reset = () => { previous = 0; };
    const tick = (now) => {
      if (!document.hidden) {
        if (previous) cursor.current = (cursor.current+(now-previous)/1000)%effect.duration;
        previous = now;
        renderer.current.render(cursor.current);
        if (now-lastUi >= 100) { setTime(cursor.current); lastUi = now; }
      } else previous = 0;
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", reset);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", reset); };
  }, [ready, playing, original, effect]);

  const seek = (value) => {
    cursor.current = Math.max(0, Math.min(effect.duration, value))%effect.duration;
    setTime(cursor.current);
    renderer.current?.render(cursor.current, original);
  };
  return <section className="motion-player" aria-label={`${effect.label}动效播放器`}>
    <div className="motion-artwork" aria-busy={!ready && !error}>
      <canvas ref={canvas} width={effect.width} height={effect.height} role="img" aria-label={`${effect.label}常亮色带动效`} />
      {!ready && !error && <span className="motion-loading">正在载入动效</span>}
      {error && <div className="motion-media-message" role="alert">{error}</div>}
    </div>
    <MotionControls effect={effect} playing={playing && ready && !original} ready={ready} time={time} duration={effect.duration}
      onPrevious={onPrevious} onNext={onNext} onToggle={() => { if (original) { setOriginal(false); setPlaying(true); } else setPlaying((value) => !value); }} onSeek={seek} />
    <div className="motion-color-flow-note"><div><strong>全段常亮 · 色带流动</strong><p>灯珠与纹理保持位置，灯带、光晕和背景的同色分段一起变色。</p></div>
      <button className="secondary-button" type="button" disabled={!ready} aria-pressed={original} onClick={() => setOriginal((value) => !value)}>{original ? "返回动效" : "原图对照"}</button>
    </div>
  </section>;
}
