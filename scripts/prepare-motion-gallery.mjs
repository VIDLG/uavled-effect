import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { simulateFrames, FRAME_RATE } from "../simulator/src/simulate.js";

const output = "assets/effects/generated-motion-gallery";
await mkdir(output, { recursive: true });
const prelude = await readFile("dist/prelude.js", "utf8");
const definitions = [
  { id: "styleCyberpunk", label: "赛博朋克", description: "粉青交替，霓虹循着轮廓前行。", palette: ["#ec44ba", "#26d9ed"], existing: true,
    rules: "phase=(_frame*4+i*42)%512; corresponding phase moves -4/42 LEDs/source frame; mirrored left/right; diagonal highlights move upper-left; rare localized glitch" },
  { id: "styleMatrix", label: "黑客帝国", description: "绿光逐次亮起，数字光雨缓缓落下。", palette: ["#72e23a", "#123b29"], existing: true,
    rules: "independent random LED triggers, brightness decay 15/source frame; no LED chase; source-triggered background heads fall downward" },
  { id: "styleForest", label: "森林", description: "绿意层层起伏，萤光在林间闪动。", palette: ["#65cf36", "#c8ea60"],
    rules: "canopy=sin255(_frame*3+i*32), understory=sin255(_frame*2+i*19+80); main phase moves -3/32 LEDs/frame, secondary -2/19; brief firefly when (_frame+i*9)%47==0; green tones and yellow-green flashes" },
  { id: "styleOcean", label: "海洋", description: "蓝青波纹交错，光沿轮廓流动。", palette: ["#25c9e8", "#2058e2"],
    rules: "w1=sin255(_frame*3+i*30), w2=sin255(_frame*2+i*50+128); phases move -3/30 and -2/50 LEDs/frame; blue base with cyan wave crests; no red or purple" },
  { id: "styleAurora", label: "极光", description: "紫红光幕舒展，层层掠过机身。", palette: ["#d64bd8", "#6c2b8c"],
    renderRevision: "calibration-v4", video: "styleAurora-calibrated-v4-loop.mp4",
    rules: "curtain=sin255(_frame*2+i*28), shimmer=sin255(_frame*3+i*17+96); phases move -2/28 and -3/17 LEDs/frame; ACTUAL native JavaScript simulator RGB is MAGENTA/PURPLE because ledHsv uses fractional region=h/60 with exact integer branch comparisons; follow actual RGB, not the green/cyan comment; no rainbow" },
];
definitions.push(
  { id: "styleLava", label: "熔岩", description: "橙红热流沿灯带推进，岩层光纹缓慢起伏。", palette: ["#ff5310", "#ff9d35"],
    renderRevision: "motion-expansion-v1", periodFrames: 256, closureFrames: 0, texturePeriodFrames: 128,
    rules: "w=sin255(_frame*2+i*45); warm RGB=(180+heat*75/255,heat*120/255,heat*20/255); hot crests advance -2/45 logical LEDs/source frame, always lit; broad outer lava fronts move more slowly; no moving rocks or body" },
  { id: "styleGalaxy", label: "银河", description: "蓝紫星云缓慢流动，零星白光独立闪现。", palette: ["#4e33cf", "#b4bdff"],
    renderRevision: "motion-expansion-v1",
    rules: "nebula=sin255(_frame*2+i*34), drift=sin255(_frame*3+i*15+140); phases advance -2/34 and -3/15 LEDs/frame; blue-purple base with localized near-white flashes when (_frame*2+i*13)%71<2; background star activity follows source flash envelope; no whole-drone blinking" },
  { id: "styleNeon", label: "霓虹", description: "紫红底色常亮，彩色色块周期闪变。", palette: ["#ec20cf", "#4933ef"],
    renderRevision: "motion-expansion-v1", periodFrames: 180, closureFrames: 0, texturePeriodFrames: 180,
    rules: "h=(_frame*2+i*45)%360, but ACTUAL native-JavaScript ledHsv produces identical magenta RGB on most frames; at source frames 14,29,44,... exact integer sectors cause short discrete multicolor blocks. Constant base plus intermittent color changes, NOT continuous spatial flow. Follow actual RGB, keep all LED carriers fixed, do not invent a rainbow chase", keyframes: [0,14,29,44,59,89,119,149] },
  { id: "styleHeartbeat", label: "心跳", description: "整条灯带同步双拍，短暂熄灭后再次跳动。", palette: ["#ff0028", "#72001b"],
    renderRevision: "motion-expansion-v1", call: "styleHeartbeat(255,0,40)", periodFrames: 180, closureFrames: 0,
    texturePeriodFrames: 180, singleArtwork: true, posterFrame: 7, keyframes: [0,7,15,19,27,35,89,97],
    rules: "90-source-frame / 3-second period: triangular first pulse at phases 0..15, second at 20..35, then LEDs exactly off until next beat; all 40 LEDs use one RGB and one brightness, no chase. Animate only light zones and background pulse motifs, keep neutral drone fixed. One existing generated artwork is sufficient; no synthetic spatial keyframes are claimed" },
);
const preludeSha256 = createHash("sha256").update(prelude).digest("hex");
let previous;
try { previous = JSON.parse(await readFile(`${output}/source-frames.json`, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const styles = {};
for (const definition of definitions) {
  const source = await readFile(`styles/${definition.id}.js`, "utf8");
  definition.sourceSha256 = createHash("sha256").update(source).digest("hex");
  const saved = previous?.definitions.find((entry) => entry.id === definition.id);
  styles[definition.id] = previous?.preludeSha256 === preludeSha256 && saved?.sourceSha256 === definition.sourceSha256
    ? previous.styles[definition.id]
    : simulateFrames(prelude, definition.call || `${definition.id}()`, 257, 40);
  definition.keyframes ||= definition.id === "styleNeon" ? [0,24,48,72,96,120,144,168]
    : Array.from({ length: 8 }, (_, i) => i * (definition.existing || definition.id === "styleLava" ? 16 : 32));
}
const data = { sourceFps: FRAME_RATE, renderFps: 60, periodFrames: 256, closureFrames: 12,
  preludeSha256, definitions, styles };
await writeFile(`${output}/source-frames.json`, JSON.stringify(data) + "\n");
await writeFile(`${output}/rules.json`, JSON.stringify({ model: "gpt-image-2.5-flare", sourceAuthority: "continuous simulator RGB and calibrated positions", definitions }, null, 2) + "\n");
console.log(`Saved ${definitions.length} source traces and pre-generation mappings; unchanged historical traces retained.`);
