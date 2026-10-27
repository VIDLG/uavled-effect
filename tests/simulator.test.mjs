import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { simulateFrames } from "../simulator/src/simulate.js";
import { additionalCalls } from "../simulator/src/sampleCalls.js";
import { buildTopology } from "../simulator/src/topology.js";

const prelude = await readFile(resolve("dist/prelude.js"), "utf8");

test("chase advances along the logical strip and mirrors without a second script", () => {
  const frames = simulateFrames(prelude, "effectChase(255, 80, 20, 4)", 12);
  const brightestIndex = (leds) => leds.reduce((best, led, index) => led[0] > leds[best][0] ? index : best, 0);
  assert.equal(frames.length, 12);
  assert(brightestIndex(frames[8]) > brightestIndex(frames[0]));
  assert.equal(frames[0].length, 40);
});

test("invalid effect calls surface an execution error", () => {
  assert.throws(() => simulateFrames(prelude, "unknownEffect()", 1), /unknownEffect/);
});

test("all selectable effect files have a runnable default call", async () => {
  const manifest = JSON.parse(await readFile(resolve("manifest.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve("dist/effect-presets.json"), "utf8"));
  const calls = new Map(registry.presets.map((preset) => [preset.id, preset.call]));
  for (const path of manifest.prelude.filter((item) => /^(effects|styles)\//.test(item))) {
    const name = path.split("/").at(-1).replace(/\.js$/, "");
    const call = calls.get(name) ?? additionalCalls[name];
    assert(call, `missing call for ${path}`);
    assert.equal(simulateFrames(prelude, call, 3).length, 3, path);
  }
});

test("topology mirrors each logical LED onto both drone arms", async () => {
  const profile = JSON.parse(await readFile(resolve("simulator/src/hardware-profile.json"), "utf8"));
  const layout = buildTopology(profile, 1000, 562);
  assert.equal(layout.left.length, 40);
  assert.equal(layout.right.length, 40);
  for (let index = 0; index < 40; index += 1) {
    assert.equal(layout.left[index].index, layout.right[index].index);
    assert(Math.abs(layout.left[index].x + layout.right[index].x - 1000) < 1);
  }
});
