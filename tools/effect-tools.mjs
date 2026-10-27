import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, Script } from "node:vm";
import { compileEffect } from "../simulator/src/effectCompiler.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = resolve(ROOT, "project-scripts");
const COMPILED_DIR = resolve(ROOT, "compiled");
const SIMULATION_DIR = resolve(ROOT, "simulations");
const MAX_FRAMES = 240;
const LED_COUNT = 40;

function inside(parent, child) {
  const path = relative(parent, child);
  return path && path !== ".." && !path.startsWith(`..${sep}`) && !path.startsWith("/") && !path.startsWith("\\");
}

function safeName(name) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(name)) throw new Error("名称只能包含字母、数字、_ 和 -，且不超过 80 字符");
  return name;
}

function channel(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(255, Math.trunc(value))) : 0;
}

async function resolveExistingFile(directory, path, extensions) {
  const candidate = resolve(ROOT, path);
  if (!inside(directory, candidate) || !extensions.includes(extname(candidate).toLowerCase())) throw new Error(`文件必须位于 ${relative(ROOT, directory)}/ 内`);
  const actual = await realpath(candidate);
  if (!inside(await realpath(directory), actual)) throw new Error("文件不能通过符号链接跳出项目目录");
  return actual;
}

async function loadPrelude() {
  const manifest = JSON.parse(await readFile(resolve(ROOT, "manifest.json"), "utf8"));
  return (await Promise.all(manifest.prelude.map((path) => readFile(resolve(ROOT, path), "utf8")))).join("");
}

export async function compileProjectEffect({ file, code, name } = {}) {
  if (Boolean(file) === Boolean(code)) throw new Error("必须且只能提供 file 或 code");
  let source = code;
  let sourcePath = null;
  if (file) {
    sourcePath = await resolveExistingFile(SOURCE_DIR, file, [".ts", ".js"]);
    source = await readFile(sourcePath, "utf8");
  }
  const compiledCode = compileEffect(source);
  const artifactName = safeName(name ?? (sourcePath ? basename(sourcePath, extname(sourcePath)) : "scratch"));
  await mkdir(COMPILED_DIR, { recursive: true });
  const artifactPath = resolve(COMPILED_DIR, `${artifactName}.js`);
  await writeFile(artifactPath, compiledCode, "utf8");
  return { success: true, artifact: relative(ROOT, artifactPath).replaceAll("\\", "/"), source: sourcePath ? relative(ROOT, sourcePath).replaceAll("\\", "/") : "inline", bytes: Buffer.byteLength(compiledCode) };
}

export async function simulateCompiledEffect({ artifact, frames = 120 } = {}) {
  if (!artifact) throw new Error("需要 compiled/ 中的编译文件");
  if (!Number.isInteger(frames) || frames < 1 || frames > MAX_FRAMES) throw new Error(`帧数必须在 1 到 ${MAX_FRAMES} 之间`);
  const compiledPath = await resolveExistingFile(COMPILED_DIR, artifact, [".js"]);
  const [code, prelude] = await Promise.all([readFile(compiledPath, "utf8"), loadPrelude()]);
  const leds = Array.from({ length: LED_COUNT }, () => [0, 0, 0]);
  const context = createContext({
    setLed(index, r, g, b) {
      if (Number.isInteger(index) && index >= 0 && index < LED_COUNT) leds[index] = [channel(r), channel(g), channel(b)];
    },
    setAll(r, g, b) {
      for (let index = 0; index < LED_COUNT; index += 1) leds[index] = [channel(r), channel(g), channel(b)];
    },
    getLedCount: () => LED_COUNT,
  }, { codeGeneration: { strings: false, wasm: false } });
  new Script(`${prelude}\n${code}\n`, { filename: artifact }).runInContext(context, { timeout: 1000 });
  const update = new Script("update()", { filename: artifact });
  const snapshots = [];
  for (let frame = 0; frame < frames; frame += 1) {
    update.runInContext(context, { timeout: 50 });
    snapshots.push({ frame, leds: leds.map((led) => [...led]) });
  }
  await mkdir(SIMULATION_DIR, { recursive: true });
  const outputPath = resolve(SIMULATION_DIR, `${basename(compiledPath, ".js")}.json`);
  await writeFile(outputPath, JSON.stringify({ artifact: relative(ROOT, compiledPath).replaceAll("\\", "/"), frameRate: 30, ledCount: LED_COUNT, snapshots }), "utf8");
  const litIndices = (snapshot) => snapshot.leds.flatMap((led, index) => led.some((value) => value > 0) ? [index] : []);
  return { success: true, artifact: relative(ROOT, compiledPath).replaceAll("\\", "/"), output: relative(ROOT, outputPath).replaceAll("\\", "/"), frames, ledCount: LED_COUNT, frameRate: 30, firstLitIndices: litIndices(snapshots[0]), lastLitIndices: litIndices(snapshots.at(-1)) };
}
