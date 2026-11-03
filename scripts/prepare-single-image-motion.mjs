import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { simulateFrames } from "../simulator/src/simulate.js";

const root = "assets/effects/single-image-motion";
await mkdir(root, { recursive: true });
const prelude = await readFile("dist/prelude.js", "utf8");
const source = await readFile("effects/rainbow/effectRainbow.js", "utf8");
const frames = simulateFrames(prelude, "effectRainbow(3)", 256, 40);
const palette = frames.map((frame) => frame[0]);
const rules = {
  id: "effectRainbow", label: "彩虹循环", kind: "single-image",
  description: "整条常亮，彩色分段沿左右灯带同步流动。",
  palette: ["#ef4d66", "#62d957", "#278ee8"],
  duration: 256/30, width: 768, height: 512,
  source: "effects/rainbow/effectRainbow.js", call: "effectRainbow(3)",
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  preludeSha256: createHash("sha256").update(prelude).digest("hex"),
  reference: "assets/effects/generated-details/effectRainbow-detail.png",
  base: "effectRainbow-base.png", map: "effectRainbow-phase.png", paletteTexture: "effectRainbow-palette.png", poster: "effectRainbow-poster.jpg",
  sourcePeak: Math.max(...palette.flat()), sourcePalette: palette,
  rules: {
    source: "wheelRgb(_frame*3 + i*768/40), 30 source FPS; snapshot zero has already executed tick()",
    phase: "LED phase=i/40; global phase advances seconds/(256/30), forward modulo one; 16-bit per-pixel phase plus 8-bit color-zone weight",
    background: "Invert the static artwork's chromatic wheel mixture to a phase; equal phases share the same palette lookup as the LED regions",
    texture: "Fixed luminance texture and saturation; retain the source color wheel's intrinsic intensity variation; no added blinking or spatial deformation",
    material: "Neutral body and propeller materials are excluded; white emitter cores remain bright",
    limits: "Image-space background phase is an appearance mapping, not a 3D illumination solver. One artwork plus a compact phase map and 256x1 source RGB lookup; no generated frame sequence or video is used at runtime.",
  },
  fullLit: { minimumLedPeak: Math.min(...frames.flat().map((rgb) => Math.max(...rgb))), offLedCount: frames.flat().filter((rgb) => Math.max(...rgb) === 0).length },
};
await writeFile(`${root}/index.json`, JSON.stringify(rules, null, 2)+"\n");
console.log("Saved single-image source/palette mapping before preparing textures.");
