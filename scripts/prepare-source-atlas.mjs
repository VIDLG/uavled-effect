import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { simulateFrames } from "../simulator/src/simulate.js";
import { additionalCalls } from "../simulator/src/sampleCalls.js";

const root = "assets/effects/source-atlas-motion";
await mkdir(`${root}/traces`, { recursive: true });
const read = async (path) => JSON.parse(await readFile(path, "utf8"));
const [manifest, registry, names, details, current, rules] = await Promise.all([
  read("manifest.json"), read("dist/effect-presets.json"), read("function-names.json"),
  read("assets/effects/generated-details/index.json"), read("assets/effects/generated-motion-gallery/index.json"),
  read("assets/effects/geometric-detail-rules.json"),
]);
const prelude = await readFile("dist/prelude.js", "utf8");
const sha = (text) => createHash("sha256").update(text.replace(/\r\n/g,"\n")).digest("hex");
const presets = new Map(registry.presets.map((entry) => [entry.id, entry]));
const covered = new Set([...current.effects.map((entry) => entry.id), "effectRainbow"]);
const oneShot = new Set(["effectStudySegment", "effectPlanSegment", "effectCenterExpand", "effectCenterContract", "effectDampedRebound", "effectTendril", "effectBubble", "effectFade", "effectDirectionalWipe", "effectDirectionalTendril"]);
const periods = { effectSolid: 1, effectChase: 160, effectMeteor: 141, effectPulse: 184,
  effectCenterExpand: 120, effectCenterContract: 120, effectDampedRebound: 150, effectTendril: 150,
  effectBubble: 150, effectStudySegment: 150, effectPlanSegment: 150, effectBreathe: 64, effectFade: 120,
  effectDirectionalTrail: 120, effectDirectionalWipe: 120, effectDirectionalTendril: 150,
  effectMultiChase: 160, effectMultiChaseTail: 160, effectComet: 160, effectBounce: 312, effectBounceTail: 312,
  effectTheaterChase: 16, effectStack: 320, effectScanner: 312, effectStrobe: 84, effectColorWipe: 320,
  styleVaporwave: 384, styleMoonlight: 128, styleArcade: 768, stylePolice: 24, styleChristmas: 240 };
const spatial = {
  effectChase: "One bright head advances toward larger logical indices, wrapping once around the fixed mirrored S strips.",
  effectMeteor: "One head enters the logical path, advances toward larger indices, leaves a one-sided trailing wake, then exits; dark entry/exit phases are intentional.",
  effectMeteorRain: "Two heads progress at different rates toward larger logical indices, with independent trailing shimmer and sparse blue-white sparks.",
  effectFire: "Heat ignites at logical indices 0..2, diffuses toward larger indices, and cools. Warm tongues and hot ridges change shape and position.",
  effectIceFire: "The same heat propagation toward larger logical indices uses BLUE/CYAN ice-flame RGB only. No orange/red ice-versus-fire split: actual function is blue fire.",
  effectPulse: "A thin bright front expands from logical center 19.5 toward BOTH ends. This is expansion, never a translating single dot.",
  effectCenterExpand: "A single front expands from logical center toward both ends and then holds its terminal state; no invented return trip.",
  effectCenterContract: "Two endpoint fronts contract toward logical center and hold; do not reverse this motion into expansion.",
  effectDampedRebound: "Paired fronts return inward and make successively SMALLER source-defined rebounds. Unlike ordinary chase this effect really changes direction.",
  effectTendril: "Two strands grow outward from logical center, leaving dim retained filaments. Preserve already illuminated strands behind their leading tips.",
  effectBubble: "Several drifting highlights advance at different speeds. The native function retains previously written LED values; preserve the actual accumulating occupancy.",
  effectDirectionalTrail: "A head advances toward larger logical indices, with a dim one-sided trailing wake and periodic wrap.",
  effectDirectionalWipe: "An illuminated area grows from logical index 0 toward 39 and holds; the cleared area shrinks in that direction.",
  effectDirectionalTendril: "A center-origin strand extends toward both ends, retaining dim light behind the moving front.",
  effectMultiChase: "Three separate bright heads are evenly spaced and advance toward larger logical indices; do not merge into one blob.",
  effectMultiChaseTail: "Three evenly spaced heads advance toward larger indices with distinct one-sided tails.",
  effectComet: "A bright near-white head advances toward larger logical indices with a smooth one-sided cyan wake.",
  effectBounce: "A single source point traverses the path and returns. Native JavaScript drops noninteger writes: intermittent dark frames are real; use selected lit source frames rather than inventing continuous LED occupancy.",
  effectBounceTail: "A bright point and its source-defined symmetric halo traverse and return along the path.",
  effectStack: "The lit section grows from logical index 0, fills the strip, then retreats from the far end. Retraction differs from same-direction clearing.",
  effectScanner: "A narrow bright scanning front traverses and reverses, retaining only its local falling-intensity halo.",
  effectColorWipe: "Fill from logical index 0 toward 39, then CLEAR from index 0 toward 39. This differs from stack, which retreats from the far end.",
};
const effects = [];
for (const path of manifest.prelude.filter((p) => p.startsWith("effects/") || p.startsWith("styles/"))) {
  const id = path.split("/").at(-1).replace(/\.js$/, "");
  if (covered.has(id)) continue;
  const preset = presets.get(id);
  const call = preset?.call ?? additionalCalls[id];
  if (!call) throw new Error(`Missing source call: ${id}`);
  const source = await readFile(path, "utf8"), period = periods[id] ?? 256;
  const warmupFrames = ['effectFire','effectIceFire','effectSparkle'].includes(id) ? 256 : 0;
  let trace;
  try { trace = await read(`${root}/traces/${id}.json`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!trace || trace.sourceSha256 !== sha(source) || trace.preludeSha256 !== sha(prelude) || trace.call !== call || trace.frames.length !== period || (trace.warmupFrames ?? 0) !== warmupFrames) {
    trace = { sourceSha256: sha(source), preludeSha256: sha(prelude), call, fps: 30, warmupFrames, frames: simulateFrames(prelude, call, period+warmupFrames, 40).slice(warmupFrames) };
    await writeFile(`${root}/traces/${id}.json`, JSON.stringify(trace)+"\n");
  }
  const frames = trace.frames;
  const changing = frames.some((frame) => JSON.stringify(frame) !== JSON.stringify(frames[0]));
  const uniform = frames.every((frame) => frame.every((rgb) => rgb.every((v, c) => v === frame[0][c])));
  const fullLit = frames.every((frame) => frame.every((rgb) => Math.max(...rgb)>0));
  const policy = !changing ? "static" : oneShot.has(id) ? "one-shot" : spatial[id] ? "generated-keyframes" : fullLit ? "single-image-flow" : "single-image-flash";
  const reference = id === "effectIceFire" ? details.iceFire : details.details.find((entry) => entry.id === id)?.path;
  if (!reference) throw new Error(`Missing artwork: ${id}`);
  const keys = [0,1,2,3].map((i) => Math.floor((period-1)*i/4));
  if (id === "effectBounce") for (let i=1;i<4;i++) { while (keys[i]<period-1 && !frames[keys[i]].some((rgb)=>rgb.some(Boolean))) keys[i]++; }
  const sourceBehavior = spatial[id] ?? (id === "stylePolice" ? "Source indices 0..19 flash RED together for 12 frames, then 20..39 flash BLUE for 12. The same 40-index path is mirrored on BOTH sides: upper/lower strip sections alternate, never whole physical left versus right."
    : id === "effectColorSparkle" ? "Independent rainbow-color births and per-LED RGB decay by 180/255; color zones flash locally, not a two-color strobe or a uniform rainbow chase."
    : id === "effectBreathe" ? "One global breathing intensity on all LEDs; fixed spatial distribution, no chase and no whole-drone dimming."
    : id === "effectFade" ? "One-shot fade IN during 90 source frames, then hold; no invented fade-out half-cycle."
    : id === "effectSolid" ? "Native solid is STATIC. Do not add blinking, scrolling, background movement or a fake playback cycle."
    : uniform ? "Uniform source RGB and intensity changes only; all light regions follow that source envelope, neutral material stays fixed."
    : "Use every captured native JavaScript RGB state on its fixed logical index. Existing full-lit segments can animate using one fixed artwork; local flashes change only their corresponding light zones.");
  effects.push({ id, label: preset?.label ?? names.names[id], source: path, call, reference, sourceSha256: trace.sourceSha256,
    periodFrames: period, duration: period/30, warmupFrames, isStatic: !changing, oneShot: oneShot.has(id), uniform, fullLit, policy,
    generated: Boolean(spatial[id]) && changing, keyframes: keys, referenceFrame: Math.min(period-1,rules.functionRules[id]?.frame ?? 90),
    behavior: sourceBehavior, appearance: rules.functionRules[id]?.behavior ?? source.match(/\/\/ 中文：([^\r\n]+)/)?.[1] ?? "Source RGB", sourceExcerpt: source.trim(),
    trace: `traces/${id}.json`, peak: Math.max(...frames.flat(2)),
  });
}
await writeFile(`${root}/mapping.json`, JSON.stringify({ version:1, sourceFps:30, sharedForeground:"../generated-motion-gallery/foreground-detail-v3/", model:"gpt-image-2.5-flare",
  invariants:["Keep approved dense emitter footprints and physical positions; never high-pass display texture", "Use an actual silhouette, not a visible convex plate or dark collar", "Neutral drone material never pulses", "Native JS RGB is authoritative; fractional branches and retained LED writes are not silently repaired", "Full-lit color flow can use one artwork; moving heads/fronts require distinct generated positions", "Static effects stay static; one-shots end and can replay"], effects },null,2)+"\n");
console.log(`Mapped ${effects.length} remaining functions: ${effects.filter(e=>!e.isStatic).length} dynamic, ${effects.filter(e=>e.isStatic).length} static, ${effects.filter(e=>e.generated).length} generated background sequences.`);
