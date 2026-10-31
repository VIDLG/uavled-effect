import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const functionNames = JSON.parse(await readFile(resolve(root, "function-names.json"), "utf8"));

test("one source file per named prelude function", async () => {
  const names = new Set();
  for (const path of manifest.prelude.slice(1)) {
    const source = await readFile(resolve(root, path), "utf8");
    const matches = [...source.matchAll(/^function\s+([A-Za-z_][A-Za-z_0-9]*)\s*\(/gm)];
    assert.equal(matches.length, 1, path);
    assert.equal(path.split("/").at(-1), `${matches[0][1]}.js`);
    assert(!names.has(matches[0][1]), `duplicate ${matches[0][1]}`);
    names.add(matches[0][1]);
  }
  assert.equal(names.size, 98);
});

test("presets are unique and reference built-in functions", async () => {
  const names = new Set();
  for (const path of manifest.presets) {
    const { preset, stylePreset } = JSON.parse(await readFile(resolve(root, path), "utf8"));
    assert(!names.has(preset.id), `duplicate ${preset.id}`);
    names.add(preset.id);
    assert.equal(path.split("/").at(-1), `${preset.id}.json`);
    assert(preset.call.startsWith(`${preset.id}(`), preset.id);
    if (stylePreset) assert.equal(stylePreset.id, preset.id);
  }
  assert.equal(names.size, 44);
  assert.equal(manifest.stylePresets.length, 16);
});

test("every extracted effect has a concrete display name", async () => {
  const registry = JSON.parse(await readFile(resolve(root, "dist/effect-presets.json"), "utf8"));
  const labels = new Map([...registry.presets, ...registry.stylePresets].map((entry) => [entry.id, entry.label]));
  for (const path of manifest.prelude.filter((item) => /^(effects|styles)\//.test(item))) {
    const id = path.split("/").at(-1).replace(/\.js$/, "");
    const label = labels.get(id) ?? functionNames.names[id];
    assert(label, `missing display name for ${id}`);
    assert.notEqual(label, id, `display name still uses internal id for ${id}`);
  }
});

test("standalone build assembles the full library", async () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "pipe" });
  const prelude = await readFile(resolve(root, "dist/prelude.js"), "utf8");
  const registry = JSON.parse(await readFile(resolve(root, "dist/effect-presets.json"), "utf8"));
  assert.equal([...prelude.matchAll(/^function\s+/gm)].length, 98);
  assert.equal(registry.presets.length, 44);
  assert.equal(registry.stylePresets.length, 16);
  for (const entry of manifest.compact) {
    assert.equal(await readFile(resolve(root, "dist", entry.path), "utf8"), await readFile(resolve(root, entry.path), "utf8"));
  }
});
