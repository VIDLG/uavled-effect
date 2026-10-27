import manifest from "../../manifest.json";
import registry from "../../dist/effect-presets.json";
import { additionalCalls } from "./sampleCalls.js";

const effectSources = import.meta.glob("../../effects/**/*.js", { query: "?raw", import: "default", eager: true });
const styleSources = import.meta.glob("../../styles/*.js", { query: "?raw", import: "default", eager: true });
const sources = { ...effectSources, ...styleSources };
const projectSources = import.meta.glob("../../project-scripts/**/*.{ts,js}", { query: "?raw", import: "default", eager: true });
const compiledSources = import.meta.glob("../../compiled/**/*.js", { query: "?raw", import: "default", eager: true });
const presets = new Map(registry.presets.map((preset) => [preset.id, preset]));

const categoryNames = {
  ambience: "氛围", basic: "基础", composition: "编排", flashes: "闪烁",
  motion: "运动", rainbow: "彩虹", trails: "拖尾", waves: "波形", styles: "风格",
};

export const scripts = manifest.prelude
  .filter((path) => path.startsWith("effects/") || path.startsWith("styles/"))
  .map((path) => {
    const id = path.split("/").at(-1).replace(/\.js$/, "");
    const preset = presets.get(id);
    const category = path.startsWith("styles/") ? "styles" : path.split("/")[1];
    return {
      id,
      path,
      label: preset?.label ?? id,
      category,
      categoryLabel: categoryNames[category],
      call: preset?.call ?? additionalCalls[id],
      source: sources[`../../${path}`],
    };
  });

export const categories = ["全部", ...new Set(scripts.map((script) => script.categoryLabel))];

export const projectScripts = Object.entries(projectSources).map(([path, source]) => ({
  path: path.slice(6),
  name: path.split("/").at(-1).replace(/\.(ts|js)$/, ""),
  source,
}));

export const compiledScripts = Object.entries(compiledSources).map(([path, code]) => ({
  id: `compiled:${path}`,
  path: path.slice(6),
  label: path.split("/").at(-1),
  categoryLabel: "已编译",
  compiledCode: code,
  source: code,
}));
