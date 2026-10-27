import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { compileEffect } from "../simulator/src/effectCompiler.js";
import { simulateCompiledFrames } from "../simulator/src/simulate.js";
import { compileProjectEffect, simulateCompiledEffect } from "../tools/effect-tools.mjs";

const prelude = await readFile(resolve("dist/prelude.js"), "utf8");

test("compiler transpiles an update script and browser simulation advances it", () => {
  const code = compileEffect("function update(): void { tick(); effectChase(255, 90, 20, 4); }");
  assert.match(code, /function update\(\)/);
  assert.doesNotMatch(code, /: void/);
  const frames = simulateCompiledFrames(prelude, code, 12);
  assert.equal(frames.length, 12);
  assert.notDeepEqual(frames[0], frames[8]);
});

test("compiler reports invalid syntax and missing update before simulation", () => {
  assert.throws(() => compileEffect("function update(: void {}"));
  assert.throws(() => compileEffect("effectChase(255, 0, 0, 4)"), /update/);
  assert.throws(() => compileEffect("export function update() {}"), /import\/export/);
});

test("project file compiles to an artifact and independently simulates", async () => {
  const name = `test-wing-${process.pid}`;
  try {
    const compiled = await compileProjectEffect({ file: "project-scripts/wing-chase.ts", name });
    assert.equal(compiled.artifact, `compiled/${name}.js`);
    const simulation = await simulateCompiledEffect({ artifact: compiled.artifact, frames: 10 });
    assert.equal(simulation.frames, 10);
    assert.notDeepEqual(simulation.firstLitIndices, simulation.lastLitIndices);
    const output = JSON.parse(await readFile(resolve(simulation.output), "utf8"));
    assert.equal(output.snapshots.length, 10);
    assert.equal(output.snapshots[0].leds.length, 40);
    const browserFrames = simulateCompiledFrames(prelude, await readFile(resolve(compiled.artifact), "utf8"), 10);
    assert.deepEqual(output.snapshots.map((snapshot) => snapshot.leds), browserFrames);
  } finally {
    await Promise.all([
      rm(resolve(`compiled/${name}.js`), { force: true }),
      rm(resolve(`simulations/${name}.json`), { force: true }),
    ]);
  }
});

test("tool files remain inside their assigned project directories", async () => {
  await assert.rejects(compileProjectEffect({ file: "../ledjs-ai/package.json" }), /project-scripts/);
  await assert.rejects(simulateCompiledEffect({ artifact: "project-scripts/wing-chase.ts" }), /compiled/);
});

test("non-terminating compiled script stops within the simulator timeout", async () => {
  const name = `test-loop-${process.pid}`;
  try {
    const compiled = await compileProjectEffect({ code: "function update() { while (true) {} }", name });
    await assert.rejects(simulateCompiledEffect({ artifact: compiled.artifact, frames: 1 }), /timed out/i);
  } finally {
    await rm(resolve(`compiled/${name}.js`), { force: true });
  }
});
