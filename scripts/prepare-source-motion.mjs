import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { simulateFrames, FRAME_RATE } from "../simulator/src/simulate.js";

const output = process.argv[2] ?? "assets/effects/generated-keyframe-experiments/source-motion-v1";
await mkdir(output, { recursive: true });
const prelude = await readFile("dist/prelude.js", "utf8");
const keyframes = Array.from({ length: 8 }, (_, i) => i * 16);
const styles = Object.fromEntries(["styleCyberpunk", "styleMatrix"].map((id) => [
  id, simulateFrames(prelude, `${id}()`, keyframes.at(-1) + 1, 40),
]));
await writeFile(`${output}/source-frames.json`, JSON.stringify({
  sourceFps: FRAME_RATE, renderFps: 60, keyframes,
  preludeSha256: createHash("sha256").update(prelude).digest("hex"),
  styles,
}) + "\n");
console.log(`Saved ${keyframes.at(-1) + 1} consecutive source frames per style.`);
