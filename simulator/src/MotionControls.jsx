import React from "react";
import { Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react";

export function formatTime(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export default function MotionControls({ effect, playing, ready, time, duration, onPrevious, onNext, onToggle, onSeek }) {
  return <>
    <div className="motion-now-playing">
      <div><p className="eyebrow">NOW PLAYING</p><h2>{effect.label}</h2><p>{effect.description}</p></div>
      <span className={`motion-loop-label ${playing ? "is-playing" : ""}`}><Repeat size={15} />{effect.isStatic?"常亮":effect.oneShot?(playing?"正在播放":"单次播放"):playing ? "循环播放中" : "已暂停"}</span>
    </div>
    <div className="motion-transport">
      <button className="icon-button" type="button" aria-label="上一种动效" onClick={onPrevious}><SkipBack size={19} /></button>
      <button className="motion-play-button" type="button" aria-label={playing ? "暂停动效" : "播放动效"} disabled={!ready||effect.isStatic} onClick={onToggle}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
      <button className="icon-button" type="button" aria-label="下一种动效" onClick={onNext}><SkipForward size={19} /></button>
      <span className="motion-current-time">{formatTime(time)}</span>
      <input className="motion-seek" type="range" min="0" max={duration} step="0.01" value={Math.min(time, duration)}
        disabled={!ready||effect.isStatic} aria-label="动效播放进度" onChange={(event) => onSeek(Number(event.target.value))} />
      <span className="motion-duration">{formatTime(duration)}</span>
    </div>
  </>;
}
