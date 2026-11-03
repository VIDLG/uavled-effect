import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { simulateFrames, FRAME_RATE } from "../simulator/src/simulate.js";
import { buildTopology } from "../simulator/src/topology.js";

const output = resolve(process.argv[2] ?? "assets/effects/generated-keyframe-experiments/flare-dense16");
await mkdir(output, { recursive: true });
const prelude = await readFile("dist/prelude.js", "utf8");
const profile = JSON.parse(await readFile("simulator/src/hardware-profile.json", "utf8"));
const indices = Array.from({ length: 16 }, (_, i) => i * 2);
const styles = {};
for (const id of ["styleCyberpunk", "styleMatrix"]) {
  const frames = simulateFrames(prelude, `${id}()`, indices.at(-1) + 1, 40);
  styles[id] = indices.map((index) => ({ index, rgb: frames[index] }));
}
await writeFile(resolve(output, "source-frames.json"), JSON.stringify({
  fps: FRAME_RATE,
  indices,
  preludeSha256: createHash("sha256").update(prelude).digest("hex"),
  topology: buildTopology(profile, 900, 600),
  styles,
}, null, 2) + "\n");
console.log(`Prepared ${indices.length} source frames per effect in ${output}`);
