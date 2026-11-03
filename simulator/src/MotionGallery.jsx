import React, { useEffect, useRef, useState } from "react";
import { Disc3, Pause, Play, Repeat, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import catalog from "../../assets/effects/generated-motion-gallery/index.json";
import "./MotionGallery.css";

const files = {
  ...import.meta.glob("../../assets/effects/generated-motion-gallery/*-loop.mp4", { eager: true, query: "?url", import: "default" }),
  ...import.meta.glob("../../assets/effects/generated-motion-gallery/posters/*.jpg", { eager: true, query: "?url", import: "default" }),
  ...import.meta.glob("../../assets/effects/generated-motion-gallery/keyframes/*.jpg", { eager: true, query: "?url", import: "default" }),
};
const asset = (path) => files[`../../assets/effects/generated-motion-gallery/${path}`];
const effects = catalog.effects.map((effect) => ({ ...effect, video: asset(effect.video), poster: asset(effect.poster),
  keyframes: effect.keyframes.map((frame) => ({ ...frame, image: asset(frame.image) })) }));

function clock(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function MotionPlayer({ effect, onPrevious, onNext }) {
  const videoRef = useRef(null);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const wanted = useRef(!reducedMotion.current);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(effect.duration);

  const play = () => videoRef.current?.play().catch(() => { setPlaying(false); });
  useEffect(() => {
    const video = videoRef.current;
    const visibility = () => {
      if (document.hidden) video.pause();
      else if (wanted.current) play();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      wanted.current = false;
      document.removeEventListener("visibilitychange", visibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    wanted.current = video.paused;
    if (wanted.current) play();
    else video.pause();
  };
  const seek = (value) => {
    const video = videoRef.current;
    if (!ready || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, value));
    setTime(video.currentTime);
  };

  return <section className="motion-player" aria-label={`${effect.label}动效播放器`}>
    <div className="motion-artwork" aria-busy={!ready && !failed}>
      <video ref={videoRef} src={effect.video} poster={effect.poster} loop muted playsInline
        autoPlay={!reducedMotion.current} preload="metadata" aria-label={`${effect.label}循环动效`}
        onLoadedMetadata={() => setDuration(videoRef.current.duration)}
        onLoadedData={() => { setReady(true); if (wanted.current && !document.hidden) play(); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={() => setTime(videoRef.current.currentTime)}
        onError={() => { setFailed(true); setReady(false); setPlaying(false); }} />
      {failed && <div className="motion-media-message" role="alert"><span>暂时无法播放这段动效</span><button className="secondary-button" type="button" onClick={() => { setFailed(false); videoRef.current.load(); }}><RotateCcw size={15} />重新载入</button></div>}
      {!ready && !failed && <span className="motion-loading">正在载入动效</span>}
    </div>
    <div className="motion-now-playing">
      <div><p className="eyebrow">NOW PLAYING</p><h2>{effect.label}</h2><p>{effect.description}</p></div>
      <span className={`motion-loop-label ${playing ? "is-playing" : ""}`}><Repeat size={15} />{playing ? "循环播放中" : "已暂停"}</span>
    </div>
    <div className="motion-transport">
      <button className="icon-button" type="button" aria-label="上一种动效" onClick={onPrevious}><SkipBack size={19} /></button>
      <button className="motion-play-button" type="button" aria-label={playing ? "暂停动效" : "播放动效"} disabled={!ready} onClick={toggle}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
      <button className="icon-button" type="button" aria-label="下一种动效" onClick={onNext}><SkipForward size={19} /></button>
      <span className="motion-current-time">{clock(time)}</span>
      <input className="motion-seek" type="range" min="0" max={Number.isFinite(duration) ? duration : effect.duration} step="0.01"
        value={Math.min(time, Number.isFinite(duration) ? duration : effect.duration)} disabled={!ready} aria-label="动效播放进度"
        onChange={(event) => seek(Number(event.target.value))} />
      <span className="motion-duration">{clock(duration)}</span>
    </div>
    <div className="motion-keyframe-heading"><strong>关键画面</strong><span>点击跳转到这一刻</span></div>
    <div className="motion-keyframes">
      {effect.keyframes.map((frame, index) => <button key={frame.sourceFrame} type="button" disabled={!ready}
        onClick={() => seek(frame.time)} aria-label={`跳转至${effect.label}第${index + 1}个关键画面`}>
        <img src={frame.image} alt={`${effect.label}关键画面 ${index + 1}`} loading="lazy" decoding="async" />
        <span>{frame.time.toFixed(2)} s</span>
      </button>)}
    </div>
  </section>;
}

export default function MotionGallery() {
  const [selectedId, setSelectedId] = useState(effects[0].id);
  const selectedIndex = effects.findIndex((effect) => effect.id === selectedId);
  const selected = effects[selectedIndex];
  const change = (step) => setSelectedId(effects[(selectedIndex + step + effects.length) % effects.length].id);

  return <main className="motion-gallery" style={{ "--motion-accent": selected.palette[0] }}>
    <header className="motion-gallery-heading"><div><p className="eyebrow">UAVLED / MOTION ALBUM</p><h1>动效专辑</h1><p className="section-subtitle">让光循着轮廓流动，也让每一种节奏有自己的画面。</p></div><span className="motion-album-count"><Disc3 size={17} />{effects.length} 种灯光</span></header>
    <div className="motion-gallery-layout">
      <aside className="motion-playlist" aria-label="选择灯光动效">
        <div className="motion-playlist-heading"><strong>全部动效</strong><span>选择并播放</span></div>
        <div className="motion-playlist-items">{effects.map((effect, index) => <button key={effect.id} type="button"
          className={`motion-track ${selectedId === effect.id ? "selected" : ""}`} aria-pressed={selectedId === effect.id}
          onClick={() => setSelectedId(effect.id)} aria-label={`选择${effect.label}动效`}>
          <span className="motion-track-number">{String(index + 1).padStart(2, "0")}</span>
          <img src={effect.poster} alt="" loading="lazy" decoding="async" />
          <span className="motion-track-copy"><strong>{effect.label}</strong><small>{clock(effect.duration)} · 循环</small></span>
          <span className="motion-palette" aria-hidden="true">{effect.palette.map((color) => <i key={color} style={{ background: color }} />)}</span>
        </button>)}</div>
      </aside>
      <MotionPlayer key={selected.id} effect={selected} onPrevious={() => change(-1)} onNext={() => change(1)} />
    </div>
  </main>;
}
