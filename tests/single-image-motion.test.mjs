import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulateFrames } from "../simulator/src/simulate.js";
import { phaseAt, samplePalette, shadePixel } from "../simulator/src/singleImageMotion.js";

const frames = simulateFrames(readFileSync("dist/prelude.js", "utf8"), "effectRainbow(3)", 256, 40);
const palette = frames.map((frame) => frame[0]);
const near = (a, b, tolerance = 2) => a.forEach((v, i) => assert(Math.abs(v-b[i]) <= tolerance, `${a} vs ${b}`));

test("single-image phases match source RGB at every LED and move forward", () => {
  for (const time of [0, 16, 64, 128, 255]) {
    for (let led = 0; led < 40; led++) near(samplePalette(palette, phaseAt(led/40, time/30, 256/30)), frames[time][led]);
  }
  assert.equal(phaseAt(.2, 256/30, 256/30), .2);
  assert(phaseAt(.2, .1, 256/30) > .2);
});

test("all lit zones remain lit, neutral pixels stay exact, equal phases stay coherent", () => {
  const neutral = [128, 130, 131, 255];
  for (let i = 0; i < 256; i++) {
    assert.deepEqual(shadePixel(neutral, 0, 0, palette[i], 100), neutral);
    const halo = shadePixel([90, 30, 8, 255], .8, 1, palette[i], 100);
    assert(Math.max(...halo.slice(0, 3)) > 35, "Full-lit flow must not gain a black blink interval");
    const half = shadePixel([45, 15, 4, 255], .8, 1, palette[i], 100);
    near(half.slice(0, 3).map((v) => v*2), halo.slice(0, 3));
  }
});
