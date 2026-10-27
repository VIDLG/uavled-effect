import React, { useEffect, useRef, useState } from "react";
import { Check, Download, FileCode2, FolderOpen, Hammer, MonitorPlay, Plus } from "lucide-react";
import { projectScripts } from "./catalog.js";

const STARTER = "function update(): void {\n  tick();\n  effectChase(255, 90, 20, 4);\n}\n";

export default function CompilerView({ onSimulate }) {
  const [name, setName] = useState(projectScripts[0]?.name ?? "scratch");
  const [source, setSource] = useState(projectScripts[0]?.source ?? STARTER);
  const [origin, setOrigin] = useState(projectScripts[0]?.path ?? "new");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const workerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    workerRef.current?.terminate();
    clearTimeout(timeoutRef.current);
  }, []);

  const setScript = (script) => {
    setName(script.name);
    setSource(script.source);
    setOrigin(script.path);
    setResult(null);
    setStatus("idle");
    setError("");
  };

  const compile = () => {
    workerRef.current?.terminate();
    clearTimeout(timeoutRef.current);
    const worker = new Worker(new URL("./compiler.worker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;
    setStatus("loading");
    setError("");
    setResult(null);
    timeoutRef.current = setTimeout(() => {
      worker.terminate();
      if (workerRef.current === worker) {
        setStatus("error");
        setError("编译超时");
      }
    }, 20000);
    worker.onerror = (event) => {
      clearTimeout(timeoutRef.current);
      worker.terminate();
      setStatus("error");
      setError(event.message || "编译 Worker 加载失败");
    };
    worker.onmessage = ({ data }) => {
      if (data.action !== "compile" || workerRef.current !== worker) return;
      clearTimeout(timeoutRef.current);
      worker.terminate();
      setStatus(data.error ? "error" : "ready");
      setError(data.error ?? "");
      if (data.code) setResult({ name: name.trim() || "scratch", code: data.code, origin });
    };
    worker.postMessage({ action: "compile", id: 1, code: source });
  };

  const download = () => {
    const filename = /^[A-Za-z0-9_-]{1,80}$/.test(result.name) ? result.name : "effect";
    const url = URL.createObjectURL(new Blob([result.code], { type: "text/javascript" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.js`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <main className="compiler-view">
    <div className="compiler-head"><div><p className="eyebrow">TOOLS / COMPILER</p><h1>脚本编译器</h1></div><span className="tool-state">{status === "loading" ? "编译中" : status === "ready" ? <><Check size={15} />编译完成</> : status === "error" ? "编译失败" : "等待编译"}</span></div>
    <div className="compiler-layout">
      <aside className="compiler-files">
        <div className="aside-head"><strong>项目脚本</strong><span>{projectScripts.length}</span></div>
        <div className="compiler-file-list">
          {projectScripts.map((script) => <button key={script.path} className={`compiler-file ${origin === script.path ? "selected" : ""}`} onClick={() => setScript(script)} title={script.path}><FileCode2 size={16} /><span><strong>{script.name}</strong><small>{script.path}</small></span></button>)}
        </div>
        <div className="compiler-file-actions">
          <button className="secondary-button" onClick={() => setScript({ name: "scratch", source: STARTER, path: "new" })}><Plus size={16} />新建脚本</button>
          <label className="secondary-button file-import"><FolderOpen size={16} />导入本地文件<input type="file" accept=".ts,.js,text/javascript" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setScript({ name: file.name.replace(/\.(ts|js)$/, ""), source: await file.text(), path: file.name }); event.target.value = ""; }} /></label>
        </div>
      </aside>
      <section className="editor-pane">
        <div className="pane-head"><strong>源代码</strong><span>TypeScript / JavaScript</span></div>
        <div className="editor-name"><label htmlFor="effect-name">脚本名称</label><input id="effect-name" value={name} onChange={(event) => { setName(event.target.value); setResult(null); setStatus("idle"); }} /></div>
        <textarea className="code-editor" aria-label="特效脚本代码" spellCheck="false" value={source} onChange={(event) => { setSource(event.target.value); setResult(null); setStatus("idle"); }} />
        <div className="editor-actions"><span>{origin === "new" ? "未命名输入" : origin}</span><button className="primary-button" onClick={compile} disabled={status === "loading"}><Hammer size={16} />编译脚本</button></div>
      </section>
      <aside className="compiler-output">
        <div className="pane-head"><strong>编译结果</strong><span>{result ? `${new Blob([result.code]).size} B` : "-"}</span></div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {result ? <><pre className="compiled-code"><code>{result.code}</code></pre><div className="output-actions"><button className="secondary-button" onClick={download}><Download size={16} />下载 JS</button><button className="primary-button" onClick={() => onSimulate(result)}><MonitorPlay size={16} />送入模拟器</button></div></> : <div className="output-empty">{status === "loading" ? "正在编译…" : ""}</div>}
      </aside>
    </div>
  </main>;
}
