import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronRight, CircleHelp, FileCode2, Hammer, MonitorPlay, Pause, Play, RotateCcw, Search, SkipBack, SkipForward } from "lucide-react";
import CompilerView from "./CompilerView.jsx";
import DroneCanvas from "./DroneCanvas.jsx";
import { categories, compiledScripts, scripts } from "./catalog.js";
import { FRAME_COUNT, FRAME_RATE } from "./simulate.js";
import "./styles.css";

const DEFAULT_SCRIPT_ID = "effectChase";

function ScriptList({ items, selectedId, onSelect, showAction = false }) {
  return <div className="script-list">
    {items.length === 0 && <p className="empty-list">没有匹配的脚本</p>}
    {items.map((script) => <button
      type="button"
      key={script.path}
      className={`script-row ${selectedId === script.id ? "selected" : ""}`}
      onClick={() => onSelect(script)}
      title={`运行 ${script.path}`}
    >
      <span className="script-icon"><FileCode2 size={17} strokeWidth={1.8} /></span>
      <span className="script-row-copy"><strong>{script.label}</strong><small>{script.path}</small></span>
      {showAction ? <span className="row-run"><Play size={15} fill="currentColor" /></span> : <ChevronRight className="row-chevron" size={16} />}
    </button>)}
  </div>;
}

export default function App() {
  const [view, setView] = useState("library");
  const [selectedId, setSelectedId] = useState(DEFAULT_SCRIPT_ID);
  const [currentCompiled, setCurrentCompiled] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [snapshots, setSnapshots] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [calibration, setCalibration] = useState(false);
  const workerRef = useRef(null);
  const requestId = useRef(0);
  const currentScript = currentCompiled && { id: "compiled:current", path: currentCompiled.origin, label: currentCompiled.name, categoryLabel: "已编译", source: currentCompiled.code, compiledCode: currentCompiled.code };
  const simulatorScripts = [...scripts, ...compiledScripts, ...(currentScript ? [currentScript] : [])];
  const selected = simulatorScripts.find((script) => script.id === selectedId) ?? scripts[0];

  useEffect(() => {
    const worker = new Worker(new URL("./simulator.worker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;
    const id = ++requestId.current;
    setStatus("loading");
    setError("");
    setPlaying(false);
    setSnapshots([]);
    setFrameIndex(0);
    const timeout = setTimeout(() => {
      if (workerRef.current !== worker) return;
      worker.terminate();
      setError("脚本运行超过 6 秒，模拟已停止");
      setStatus("error");
    }, 6000);
    worker.onmessage = ({ data }) => {
      if (data.action !== "simulate" || data.id !== id || workerRef.current !== worker) return;
      clearTimeout(timeout);
      if (data.error) {
        setError(data.error);
        setStatus("error");
        setPlaying(false);
      } else {
        setSnapshots(data.snapshots);
        setFrameIndex(0);
        setStatus("ready");
        setPlaying(true);
      }
    };
    worker.onerror = (event) => {
      clearTimeout(timeout);
      setError(event.message || "模拟 Worker 加载失败");
      setStatus("error");
    };
    worker.postMessage({ action: "simulate", id, code: selected.compiledCode ?? `function update() { tick(); ${selected.call}; }` });
    return () => {
      clearTimeout(timeout);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [selectedId, selected.compiledCode]);

  useEffect(() => {
    if (!playing || snapshots.length === 0) return;
    const timer = setInterval(() => setFrameIndex((current) => (current + 1) % snapshots.length), 1000 / (FRAME_RATE * speed));
    return () => clearInterval(timer);
  }, [playing, speed, snapshots.length]);

  const filtered = useMemo(() => scripts.filter((script) =>
    (category === "全部" || script.categoryLabel === category) &&
    `${script.label} ${script.id} ${script.path}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [category, search]);

  const openScript = (script) => {
    setSelectedId(script.id);
    setView("simulator");
  };
  const openCompiled = (result) => {
    setCurrentCompiled(result);
    setSelectedId("compiled:current");
    setCategory("全部");
    setSearch("");
    setView("simulator");
  };
  const simulatorFiltered = simulatorScripts.filter((script) =>
    (category === "全部" || script.categoryLabel === category) &&
    `${script.label} ${script.path}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const seek = (index) => {
    setPlaying(false);
    setFrameIndex(Math.max(0, Math.min(snapshots.length - 1, index)));
  };
  const frame = snapshots[frameIndex];

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><span /><span /><span /></span><span><strong>UAVLED</strong><small>EFFECT LIBRARY</small></span></div>
      <nav className="top-nav" aria-label="主导航">
        <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}><BookOpen size={17} />特效库</button>
        <button className={view === "compiler" ? "active" : ""} onClick={() => setView("compiler")} title="编译器"><Hammer size={17} />编译器</button>
        <button className={view === "simulator" ? "active" : ""} onClick={() => setView("simulator")}><MonitorPlay size={17} />模拟器</button>
      </nav>
      <div className="topbar-status"><span className="status-dot" />Skia Web <span className="topbar-divider" /> {scripts.length} 个脚本</div>
    </header>

    {view === "library" ? <main className="library-view">
      <div className="section-head">
        <div><p className="eyebrow">LIBRARY / SCRIPTS</p><h1>特效脚本</h1><p className="section-subtitle">按类型浏览内置特效，选择文件后在无人机灯带上模拟。</p></div>
        <div className="entry-actions"><button className="secondary-button" onClick={() => setView("compiler")}><Hammer size={17} />进入编译器</button><button className="primary-button" onClick={() => setView("simulator")}><MonitorPlay size={18} />进入模拟器<ChevronRight size={16} /></button></div>
      </div>
      <div className="library-toolbar">
        <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称或文件路径" aria-label="搜索特效脚本" /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="特效类型">{categories.map((name) => <option key={name}>{name}</option>)}</select>
        <span className="result-count">{filtered.length} 个文件</span>
      </div>
      <div className="library-list-head"><span>名称 / 函数 / 路径</span><span>类型</span><span>操作</span></div>
      <div className="library-list">{filtered.map((script) => <div className="library-item" key={script.path}>
        <FileCode2 className="file-icon" size={18} />
        <div className="library-item-name"><strong>{script.label}</strong><small>{script.functionName ?? script.id} · {script.path}</small></div>
        <span className="category-chip">{script.categoryLabel}</span>
        <button className="icon-button run-button" title={`模拟 ${script.label}`} aria-label={`模拟 ${script.label}`} onClick={() => openScript(script)}><Play size={17} fill="currentColor" /></button>
      </div>)}</div>
    </main> : view === "compiler" ? <CompilerView onSimulate={openCompiled} /> : <main className="simulator-view">
      <aside className="file-sidebar">
        <div className="aside-head"><strong>脚本文件</strong><span>{simulatorScripts.length}</span></div>
        <label className="search-field sidebar-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索脚本" aria-label="搜索脚本" /></label>
        <select className="sidebar-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="筛选特效类型">{[...categories, "已编译"].map((name) => <option key={name}>{name}</option>)}</select>
        <ScriptList items={simulatorFiltered} selectedId={selectedId} onSelect={(script) => setSelectedId(script.id)} />
      </aside>

      <section className="sim-main">
        <div className="sim-heading"><div><p className="eyebrow">SIMULATOR / {selected.categoryLabel.toUpperCase()}</p><h1>{selected.label}</h1><span className="selected-path">{selected.path}</span></div><div className="sim-status">{status === "loading" ? "生成帧中" : status === "error" ? "运行失败" : <><Check size={15} />模拟就绪</>}</div></div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <DroneCanvas frame={frame} calibration={calibration} />
        <div className="transport">
          <div className="transport-controls">
            <button className="icon-button" title="回到起点" aria-label="回到起点" onClick={() => seek(0)} disabled={!snapshots.length}><RotateCcw size={18} /></button>
            <button className="icon-button" title="上一帧" aria-label="上一帧" onClick={() => seek(frameIndex - 1)} disabled={!snapshots.length}><SkipBack size={18} /></button>
            <button className="play-button" title={playing ? "暂停" : "播放"} aria-label={playing ? "暂停" : "播放"} onClick={() => setPlaying((current) => !current)} disabled={!snapshots.length}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
            <button className="icon-button" title="下一帧" aria-label="下一帧" onClick={() => seek(frameIndex + 1)} disabled={!snapshots.length}><SkipForward size={18} /></button>
          </div>
          <div className="timeline"><input type="range" min="0" max={Math.max(0, snapshots.length - 1)} value={frameIndex} onChange={(event) => seek(Number(event.target.value))} aria-label="模拟帧" disabled={!snapshots.length} /><div className="timeline-meta"><span>{(frameIndex / FRAME_RATE).toFixed(2)} s</span><span>{String(frameIndex + 1).padStart(3, "0")} / {FRAME_COUNT} 帧</span><span>{(FRAME_COUNT / FRAME_RATE).toFixed(2)} s</span></div></div>
          <div className="speed-control" role="group" aria-label="播放速度">{[0.5, 1, 2].map((value) => <button className={speed === value ? "active" : ""} key={value} onClick={() => setSpeed(value)}>{value}×</button>)}</div>
        </div>
        <div className="sim-bottom"><label className="calibration-toggle"><input type="checkbox" checked={calibration} onChange={(event) => setCalibration(event.target.checked)} /><span className="switch-track" />显示全部灯位</label><span><CircleHelp size={15} />左右机臂镜像同一组 40 灯信号</span></div>
      </section>

      <aside className="source-sidebar"><div className="aside-head"><strong>脚本详情</strong><FileCode2 size={17} /></div><div className="source-meta"><small>文件</small><code>{selected.path}</code><small>{selected.call ? "默认调用" : "类型"}</small><code>{selected.call ?? "已编译脚本"}</code></div><div className="source-label">源代码</div><pre className="source-code"><code>{selected.source}</code></pre></aside>
    </main>}
  </div>;
}
