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
    rules: "curtain=sin255(_frame*2+i*28), shimmer=sin255(_frame*3+i*17+96); phases move -2/28 and -3/17 LEDs/frame; ACTUAL native JavaScript simulator RGB is MAGENTA/PURPLE because ledHsv uses fractional region=h/60 with exact integer branch comparisons; follow actual RGB, not the green/cyan comment; no rainbow" },
];
const styles = {};
for (const definition of definitions) {
  const source = await readFile(`styles/${definition.id}.js`, "utf8");
  styles[definition.id] = simulateFrames(prelude, `${definition.id}()`, 257, 40);
  definition.sourceSha256 = createHash("sha256").update(source).digest("hex");
  definition.keyframes = Array.from({ length: 8 }, (_, i) => i * (definition.existing ? 16 : 32));
}
const data = { sourceFps: FRAME_RATE, renderFps: 60, periodFrames: 256, closureFrames: 12,
  preludeSha256: createHash("sha256").update(prelude).digest("hex"), definitions, styles };
await writeFile(`${output}/source-frames.json`, JSON.stringify(data) + "\n");
await writeFile(`${output}/rules.json`, JSON.stringify({ model: "gpt-image-2.5-flare", sourceAuthority: "continuous simulator RGB and calibrated positions", definitions }, null, 2) + "\n");
console.log("Saved five source traces and pre-generation motion/prompt mappings.");
