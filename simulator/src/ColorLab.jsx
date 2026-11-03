import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Pause, Play, Palette, RotateCcw, Upload } from "lucide-react";
import registry from "../../dist/effect-presets.json";
import functionNames from "../../function-names.json";
import prelude from "../../dist/prelude.js?raw";
import profile from "./hardware-profile.json";
import { FRAME_RATE, simulateFrames } from "./simulate.js";
import { buildTopology } from "./topology.js";

const DEFAULT_IMAGE = new URL("../../assets/effects/ice-fire/effect-ice-fire-detail.png", import.meta.url).href;
const DEFAULT_SEEDS = [[0.2, 0.18], [0.2, 0.82]];
const MAX_WIDTH = 720;
const detailImages = import.meta.glob("../../assets/effects/generated-details/*-detail.png", { eager: true, query: "?url", import: "default" });
const presetLabels = new Map([
  ...(registry.presets ?? []).map((preset) => [preset.id, preset.label]),
  ...(registry.stylePresets ?? []).map((preset) => [preset.id, preset.label]),
]);
const detailOptions = Object.entries(detailImages)
  .map(([path, url]) => {
    const filename = path.split("/").at(-1) ?? "";
    const id = filename.replace(/-detail\.png$/, "");
    return { id, label: presetLabels.get(id) ?? functionNames.names[id] ?? id, url };
  })
  .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
const EFFECT_OPTIONS = [
  { id: "effectIceFire", label: "冰火", url: DEFAULT_IMAGE },
  ...detailOptions.filter((option) => option.id !== "effectIceFire"),
];
const NO_PALETTE_IDS = new Set(["effectIceFire", "effectRainbow", "effectRainbowWave", "effectColorSparkle", "styleForest"]);
const ANIMATION_POLICIES = {
  effectFade: { kind: "fade", slots: 1, label: "单色淡入淡出" },
  effectRainbow: { kind: "rainbow", slots: 0, label: "彩虹循环" },
  effectRainbowWave: { kind: "colorWave", slots: 0, label: "色彩波动" },
  effectColorSparkle: { kind: "colorSparkle", slots: 0, label: "彩虹闪烁" },
  styleForest: { kind: "forestKeyframes", slots: 0, label: "森林时空" },
};
const FOREST_KEYFRAME_INDICES = [0, 30, 60, 90, 120, 150, 180, 210, 240];
const FOREST_KEYFRAME_MS = (FOREST_KEYFRAME_INDICES[1] - FOREST_KEYFRAME_INDICES[0]) * 1000 / FRAME_RATE;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return [hue, max ? delta / max : 0, max];
}

function hsvToRgb(hue, saturation, value) {
  const chroma = value * saturation;
  const section = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const match = value - chroma;
  const channels = section < 1 ? [chroma, x, 0] : section < 2 ? [x, chroma, 0] : section < 3 ? [0, chroma, x] : section < 4 ? [0, x, chroma] : section < 5 ? [x, 0, chroma] : [chroma, 0, x];
  return channels.map((channel) => Math.round((channel + match) * 255));
}

function hueDistance(a, b) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

function samplePixel(pixels, width, x, y) {
  const index = (y * width + x) * 4;
  return [pixels[index], pixels[index + 1], pixels[index + 2]];
}

function pickInitialSources(pixels, width, height) {
  const candidates = [];
  const step = Math.max(4, Math.round(Math.min(width, height) / 120));
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      const rgb = samplePixel(pixels, width, x, y);
      const [hue, saturation, value] = rgbToHsv(...rgb);
      if (saturation < 0.25 || value < 0.16) continue;
      candidates.push({ rgb, hue, score: saturation * (0.35 + value) });
    }
  }
  candidates.sort((left, right) => right.score - left.score);
  const first = candidates[0]?.rgb ?? [20, 170, 222];
  const firstHue = candidates[0]?.hue ?? 195;
  const second = candidates.find((candidate) => hueDistance(candidate.hue, firstHue) > 75)?.rgb ?? first;
  return [first, second];
}

function makeFeatures(pixels) {
  const count = pixels.length / 4;
  const hue = new Float32Array(count);
  const saturation = new Float32Array(count);
  const value = new Float32Array(count);
  const luminance = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const [h, s, v] = rgbToHsv(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    hue[index] = h;
    saturation[index] = s;
    value[index] = v;
    luminance[index] = (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) / 255;
  }
  return { hue, saturation, value, luminance };
}

function buildMask(features, source, tolerance) {
  const [sourceHue, sourceSaturation] = rgbToHsv(...source);
  const count = features.hue.length;
  const mask = new Float32Array(count);
  const hueLimit = tolerance * 1.8;
  for (let index = 0; index < count; index += 1) {
    const saturationWeight = clamp((features.saturation[index] - 0.08) / 0.45, 0, 1);
    const hueWeight = 1 - clamp(hueDistance(features.hue[index], sourceHue) / hueLimit, 0, 1);
    const saturationDistance = Math.abs(features.saturation[index] - sourceSaturation);
    const chromaWeight = 1 - clamp(saturationDistance / 0.75, 0, 1);
    mask[index] = hueWeight * (0.55 + chromaWeight * 0.45) * saturationWeight;
  }
  return mask;
}

function animationFactor(kind, x, y, regionIndex, time) {
  const tau = Math.PI * 2;
  if (!kind) return 1;
  if (kind === "breathe") return 0.3 + (0.7 + 0.3 * Math.sin(time * tau * 0.7)) / 1.3;
  if (kind === "fade") return 0.1 + (0.5 + 0.5 * Math.sin(time * tau * 0.45));
  if (kind === "chase") {
    const head = ((x - time * 0.36) % 1 + 1) % 1;
    const distance = Math.min(Math.abs(x - head), 1 - Math.abs(x - head));
    return 0.12 + Math.exp(-distance * distance / 0.008) * 0.88;
  }
  if (kind === "wipe") return 0.12 + (x < ((time * 0.28) % 1) ? 0.88 : 0);
  if (kind === "pulse") {
    const distance = Math.hypot(x - 0.5, y - 0.5);
    const wave = ((time * 0.32 - distance) % 1 + 1) % 1;
    return 0.12 + Math.exp(-wave * wave / 0.012) * 0.88;
  }
  if (kind === "dualWave") return 0.16 + 0.84 * (0.5 + 0.5 * Math.sin(time * tau * 0.7 + (regionIndex ? Math.PI : 0)));
  if (kind === "rainbow") return 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(time * tau * 0.85 + x * tau * 2.8 + y * tau * 0.7 + regionIndex * Math.PI / 2));
  return 0.16 + 0.84 * (0.5 + 0.5 * Math.sin((x * 2.3 - time * 0.55 + regionIndex * 0.5) * tau));
}

function circularHueMix(hues, weights) {
  let x = 0;
  let y = 0;
  hues.forEach((hue, index) => {
    const radians = hue * Math.PI / 180;
    x += Math.cos(radians) * weights[index];
    y += Math.sin(radians) * weights[index];
  });
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function mixRgb(left, right, amount) {
  return left.map((channel, index) => channel + (right[index] - channel) * amount);
}

function normalizedWeights(values) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => value / total);
}

function mapSourceToTheme(features, index, x, y, regions, targets, animation, time) {
  const sourceHue = features.hue[index];
  const sourceSaturation = features.saturation[index];
  const sourceValue = features.value[index];
  const targetHsv = targets.map((target) => rgbToHsv(...target));
  let weights;
  if (targetHsv.length < 2) {
    weights = [1];
  } else if (sourceSaturation < 0.12) {
    const field = 0.5 + 0.5 * Math.sin((x * 1.15 + y * 0.45) * Math.PI * 2);
    weights = [1 - field, field];
  } else {
    weights = normalizedWeights(targetHsv.map((_, targetIndex) => 1 / (1 + hueDistance(sourceHue, rgbToHsv(...regions[targetIndex].source)[0]) / 42)));
  }
  const hue = circularHueMix(targetHsv.map(([targetHue]) => targetHue), weights);
  const saturation = clamp(targetHsv.reduce((sum, [, targetSaturation], targetIndex) => sum + targetSaturation * weights[targetIndex], 0) * (0.22 + sourceSaturation * 0.88), 0, 1);
  const value = clamp(targetHsv.reduce((sum, [, , targetValue], targetIndex) => sum + targetValue * weights[targetIndex], 0) * (0.1 + sourceValue * 0.82), 0, 1);
  const activity = animation ? weights.reduce((sum, _, targetIndex) => sum + animationFactor(animation.kind, x, y, targetIndex, time) * weights[targetIndex], 0) : 1;
  return hsvToRgb(hue, saturation, value * (0.08 + activity * 0.92));
}

function applyColor(base, features, masks, regions, animation, width, height, timeMs, sourceOnly) {
  const output = new Uint8ClampedArray(base);
  const time = timeMs / 1000;
  if (sourceOnly && !animation?.kind) return output;
  const targets = regions.map((region) => hexToRgb(region.target));
  for (let index = 0; index < features.luminance.length; index += 1) {
    const offset = index * 4;
    const x = (index % width) / Math.max(1, width - 1);
    const y = Math.floor(index / width) / Math.max(1, height - 1);
    const colorZone = clamp((features.saturation[index] - 0.1) / 0.3, 0, 1);
    const sourceColor = [base[offset], base[offset + 1], base[offset + 2]];
    const mapped = sourceOnly
      ? hsvToRgb(features.hue[index] + (animation?.kind === "rainbow" ? Math.sin((time + x) * Math.PI * 2) * 10 : 0), features.saturation[index], features.value[index] * (0.08 + animationFactor(animation?.kind, x, y, 0, time) * 0.92))
      : mapSourceToTheme(features, index, x, y, regions, targets, animation, time);
    const composed = sourceOnly && animation?.kind === "rainbow" ? mixRgb(sourceColor, mapped, colorZone) : sourceOnly ? sourceColor : mixRgb(sourceColor, mapped, colorZone);
    let red = composed[0];
    let green = composed[1];
    let blue = composed[2];
    for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
      const temporal = animationFactor(animation?.kind, x, y, regionIndex, time);
      const mask = masks[regionIndex]?.[index] * regions[regionIndex].strength * temporal;
      if (mask < 0.005) continue;
      const target = targets[regionIndex];
      const [targetHue, targetSaturation, targetValue] = rgbToHsv(...target);
      const targetColor = hsvToRgb(targetHue, clamp(targetSaturation * (0.45 + features.saturation[index] * 0.75), 0, 1), targetValue * (0.08 + temporal * 0.92) * (0.18 + features.value[index] * 0.82));
      const [targetRed, targetGreen, targetBlue] = targetColor;
      red += (targetRed - red) * mask;
      green += (targetGreen - green) * mask;
      blue += (targetBlue - blue) * mask;
    }
    output[offset] = red;
    output[offset + 1] = green;
    output[offset + 2] = blue;
  }
  return output;
}

function colorZoneWeight(saturation) {
  return clamp((saturation - 0.1) / 0.3, 0, 1);
}

function applyFade(staticFrame, features, width, height, timeMs) {
  const output = new Uint8ClampedArray(staticFrame);
  const time = timeMs / 1000;
  const activity = 0.08 + animationFactor("fade", 0.5, 0.5, 0, time) * 0.92;
  for (let index = 0; index < features.luminance.length; index += 1) {
    const zone = colorZoneWeight(features.saturation[index]);
    const offset = index * 4;
    const scale = 1 - zone * (1 - activity);
    output[offset] = staticFrame[offset] * scale;
    output[offset + 1] = staticFrame[offset + 1] * scale;
    output[offset + 2] = staticFrame[offset + 2] * scale;
  }
  return output;
}

function applyRainbowBlink(base, features, width, timeMs, wave) {
  const output = new Uint8ClampedArray(base);
  const time = timeMs / 1000;
  const widthScale = wave ? 3.8 : 2.8;
  const minimumActivity = wave ? 0.22 : 0.18;
  for (let index = 0; index < features.luminance.length; index += 1) {
    const offset = index * 4;
    const x = (index % width) / Math.max(1, width - 1);
    const y = Math.floor(index / width) / Math.max(1, Math.ceil(features.luminance.length / width) - 1);
    const zone = colorZoneWeight(features.saturation[index]);
    if (zone < 0.02) continue;
    const phase = time * Math.PI * 2 * (wave ? 1.05 : 0.85) + features.hue[index] * Math.PI / 180 * widthScale + x * Math.PI * 5 + y * Math.PI * 1.4;
    const activity = minimumActivity + (0.5 + 0.5 * Math.sin(phase)) * (1 - minimumActivity);
    const hue = features.hue[index] + Math.sin(phase * 0.43) * (wave ? 16 : 10);
    const animated = hsvToRgb(hue, clamp(features.saturation[index] * 1.1, 0, 1), features.value[index] * activity);
    output[offset] = base[offset] + (animated[0] - base[offset]) * zone;
    output[offset + 1] = base[offset + 1] + (animated[1] - base[offset + 1]) * zone;
    output[offset + 2] = base[offset + 2] + (animated[2] - base[offset + 2]) * zone;
  }
  return output;
}

function applyColorSparkle(base, features, width, height, timeMs) {
  const output = new Uint8ClampedArray(base);
  const time = timeMs / 1000;
  const tau = Math.PI * 2;
  for (let index = 0; index < features.luminance.length; index += 1) {
    const offset = index * 4;
    const x = (index % width) / Math.max(1, width - 1);
    const y = Math.floor(index / width) / Math.max(1, height - 1);
    const zone = colorZoneWeight(features.saturation[index]);
    if (zone < 0.02) continue;
    const cellX = Math.floor(x * 42);
    const cellY = Math.floor(y * 28);
    const seed = Math.sin((cellX + 1) * 12.9898 + (cellY + 1) * 78.233) * 43758.5453;
    const phaseOffset = (seed - Math.floor(seed)) * tau;
    const phase = time * tau * 1.55 + phaseOffset + features.hue[index] * tau / 360 * 0.35;
    const activity = 0.06 + (0.5 + 0.5 * Math.sin(phase)) * 0.94;
    const animated = hsvToRgb(features.hue[index], features.saturation[index], features.value[index] * activity);
    output[offset] = base[offset] + (animated[0] - base[offset]) * zone;
    output[offset + 1] = base[offset + 1] + (animated[1] - base[offset + 1]) * zone;
    output[offset + 2] = base[offset + 2] + (animated[2] - base[offset + 2]) * zone;
  }
  return output;
}

function buildForestData(width, height) {
  const topology = buildTopology(profile, width, height);
  const points = [...topology.left, ...topology.right];
  const count = width * height;
  const nearest = new Uint8Array(count);
  const distance = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const dx = x - points[pointIndex].x;
      const dy = y - points[pointIndex].y;
      const currentDistance = dx * dx + dy * dy;
      if (currentDistance < nearestDistance) {
        nearestDistance = currentDistance;
        nearestIndex = pointIndex;
      }
    }
    nearest[index] = nearestIndex;
    distance[index] = Math.sqrt(nearestDistance);
  }
  const snapshots = simulateFrames(prelude, "styleForest()", Math.max(...FOREST_KEYFRAME_INDICES) + 1, 40);
  return {
    nearest,
    distance,
    points,
    box: topology.box,
    keyframes: FOREST_KEYFRAME_INDICES.map((frame) => snapshots[frame]),
  };
}

function interpolateLed(frameA, frameB, amount, index) {
  const left = frameA?.[index] ?? [0, 0, 0];
  const right = frameB?.[index] ?? left;
  return left.map((channel, channelIndex) => channel + (right[channelIndex] - channel) * amount);
}

function renderForestFrame(base, features, forestData, width, height, timeMs) {
  const output = new Uint8ClampedArray(base);
  const segmentCount = Math.max(1, forestData.keyframes.length - 1);
  const cycleLength = segmentCount * 2;
  const cyclePhase = ((timeMs / FOREST_KEYFRAME_MS) % cycleLength + cycleLength) % cycleLength;
  const phase = cyclePhase <= segmentCount ? cyclePhase : cycleLength - cyclePhase;
  const frameIndex = Math.min(segmentCount - 1, Math.floor(phase));
  const amount = phase - frameIndex;
  const frameA = forestData.keyframes[frameIndex];
  const frameB = forestData.keyframes[frameIndex + 1];
  for (let index = 0; index < features.luminance.length; index += 1) {
    const distance = forestData.distance[index];
    const x = index % width;
    const y = Math.floor(index / width);
    const bodyLeft = forestData.box.x + forestData.box.width * 0.08;
    const bodyRight = forestData.box.x + forestData.box.width * 0.92;
    const bodyTop = forestData.box.y + forestData.box.height * 0.06;
    const bodyBottom = forestData.box.y + forestData.box.height * 0.94;
    const insideDrone = x >= bodyLeft && x <= bodyRight && y >= bodyTop && y <= bodyBottom;
    const backgroundWeight = insideDrone ? 0 : clamp((features.saturation[index] - 0.12) / 0.34, 0, 1);
    const pointIndex = forestData.nearest[index] % 40;
    const [red, green, blue] = interpolateLed(frameA, frameB, amount, pointIndex);
    if (backgroundWeight > 0.02) {
      const [ledHue] = rgbToHsv(red, green, blue);
      const spatialWave = 0.5 + 0.5 * Math.sin(timeMs / 1000 * Math.PI * 1.15 + x * 0.014 + y * 0.009);
      const driftWave = 0.5 + 0.5 * Math.sin(timeMs / 1000 * Math.PI * 0.52 - x * 0.006 + y * 0.012);
      const hue = features.hue[index] * 0.78 + (ledHue + (driftWave - 0.5) * 12) * 0.22;
      const value = clamp(features.value[index] * (0.78 + spatialWave * 0.34), 0, 1);
      const animated = hsvToRgb(hue, clamp(features.saturation[index] * (0.9 + spatialWave * 0.24), 0, 1), value);
      const blend = backgroundWeight * (0.28 + spatialWave * 0.18);
      const offset = index * 4;
      output[offset] = base[offset] + (animated[0] - base[offset]) * blend;
      output[offset + 1] = base[offset + 1] + (animated[1] - base[offset + 1]) * blend;
      output[offset + 2] = base[offset + 2] + (animated[2] - base[offset + 2]) * blend;
    }
    if (distance > 58) continue;
    const ringInfluence = Math.exp(-(distance * distance) / (2 * 10 * 10));
    const glowInfluence = Math.exp(-(distance * distance) / (2 * 26 * 26)) * 0.08;
    const sourceShade = 0.38 + features.luminance[index] * 0.82;
    const colorRed = red * sourceShade;
    const colorGreen = green * sourceShade;
    const colorBlue = blue * sourceShade;
    const offset = index * 4;
    const blend = clamp(ringInfluence + glowInfluence, 0, 1);
    output[offset] = base[offset] + (colorRed - base[offset]) * blend;
    output[offset + 1] = base[offset + 1] + (colorGreen - base[offset + 1]) * blend;
    output[offset + 2] = base[offset + 2] + (colorBlue - base[offset + 2]) * blend;
  }
  return output;
}

const initialRegions = [
  { id: "cold", label: "色区 A", source: [20, 170, 222], target: "#21c8f4", tolerance: 42, strength: 1 },
  { id: "warm", label: "色区 B", source: [242, 76, 29], target: "#ff5a36", tolerance: 42, strength: 1 },
];

export default function ColorLab() {
  const canvasRef = useRef(null);
  const analysisRef = useRef(null);
  const masksRef = useRef([]);
  const staticFrameRef = useRef(null);
  const forestDataRef = useRef(null);
  const forestThumbRefs = useRef([]);
  const [imageSource, setImageSource] = useState(DEFAULT_IMAGE);
  const [selectedEffectId, setSelectedEffectId] = useState("effectIceFire");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [regions, setRegions] = useState(initialRegions);
  const [activeRegion, setActiveRegion] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [forestReady, setForestReady] = useState(false);

  const policy = ANIMATION_POLICIES[selectedEffectId] ?? null;
  const sourceOnly = NO_PALETTE_IDS.has(selectedEffectId);
  const staticOnly = sourceOnly && !policy;
  const editableRegions = sourceOnly ? [] : policy?.slots ? regions.slice(0, policy.slots) : regions;

  const draw = (nextRegions = regions, timeMs = 0, activeAnimation = null) => {
    const analysis = analysisRef.current;
    const canvas = canvasRef.current;
    if (!analysis || !canvas) return;
    let output;
    if (activeAnimation?.kind === "fade") {
      const staticFrame = staticFrameRef.current ?? applyColor(analysis.base, analysis.features, masksRef.current, nextRegions, null, analysis.width, analysis.height, 0, sourceOnly);
      output = applyFade(staticFrame, analysis.features, analysis.width, analysis.height, timeMs);
    } else if (activeAnimation?.kind === "rainbow" || activeAnimation?.kind === "colorWave") {
      output = applyRainbowBlink(analysis.base, analysis.features, analysis.width, timeMs, activeAnimation.kind === "colorWave");
    } else if (activeAnimation?.kind === "colorSparkle") {
      output = applyColorSparkle(analysis.base, analysis.features, analysis.width, analysis.height, timeMs);
    } else if (activeAnimation?.kind === "forestKeyframes" && forestDataRef.current) {
      output = renderForestFrame(analysis.base, analysis.features, forestDataRef.current, analysis.width, analysis.height, timeMs);
    } else {
      output = applyColor(analysis.base, analysis.features, masksRef.current, nextRegions, null, analysis.width, analysis.height, 0, sourceOnly);
      staticFrameRef.current = output;
    }
    canvas.getContext("2d").putImageData(new ImageData(output, analysis.width, analysis.height), 0, 0);
  };

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0, width, height);
      const base = sourceContext.getImageData(0, 0, width, height).data;
      const features = makeFeatures(base);
      const detectedSources = pickInitialSources(base, width, height);
      const seededRegions = initialRegions.map((region, index) => ({
        ...region,
        source: detectedSources[index] ?? samplePixel(base, width, Math.round(width * DEFAULT_SEEDS[index][0]), Math.round(height * DEFAULT_SEEDS[index][1])),
      }));
      analysisRef.current = { base, features, width, height };
      staticFrameRef.current = null;
      forestDataRef.current = selectedEffectId === "styleForest" ? buildForestData(width, height) : null;
      masksRef.current = seededRegions.map((region) => buildMask(features, region.source, region.tolerance));
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      setRegions(seededRegions);
      setReady(true);
      setForestReady(selectedEffectId === "styleForest");
    };
    image.onerror = () => setReady(false);
    image.src = imageSource;
    return () => { image.onload = null; };
  }, [imageSource, reloadNonce]);

  useEffect(() => {
    if (ready) draw(editableRegions);
  }, [ready, regions, selectedEffectId]);

  useEffect(() => {
    setPlaying(false);
  }, [selectedEffectId]);

  useEffect(() => {
    if (!forestReady || selectedEffectId !== "styleForest" || !forestDataRef.current) return;
    forestDataRef.current.keyframes.forEach((frame, index) => {
      const canvas = forestThumbRefs.current[index];
      if (!canvas) return;
      const thumbWidth = 180;
      const thumbHeight = Math.round(thumbWidth * 2 / 3);
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const thumbnail = renderForestFrame(analysisRef.current.base, analysisRef.current.features, forestDataRef.current, analysisRef.current.width, analysisRef.current.height, index * FOREST_KEYFRAME_MS);
      const thumbContext = canvas.getContext("2d");
      const image = new ImageData(thumbnail, analysisRef.current.width, analysisRef.current.height);
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = analysisRef.current.width;
      sourceCanvas.height = analysisRef.current.height;
      sourceCanvas.getContext("2d").putImageData(image, 0, 0);
      thumbContext.drawImage(sourceCanvas, 0, 0, thumbWidth, thumbHeight);
    });
  }, [forestReady, selectedEffectId]);

  useEffect(() => {
    if (!ready || !playing || !policy) return undefined;
    let animationFrame;
    const tick = (timeMs) => {
      draw(editableRegions, timeMs, policy);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [ready, playing, regions, selectedEffectId]);

  const updateRegion = (index, patch) => {
    setRegions((current) => current.map((region, regionIndex) => regionIndex === index ? { ...region, ...patch } : region));
  };

  const handleCanvasClick = (event) => {
    const analysis = analysisRef.current;
    const canvas = canvasRef.current;
    if (!analysis || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(Math.floor((event.clientX - rect.left) * analysis.width / rect.width), 0, analysis.width - 1);
    const y = clamp(Math.floor((event.clientY - rect.top) * analysis.height / rect.height), 0, analysis.height - 1);
    const source = samplePixel(analysis.base, analysis.width, x, y);
    updateRegion(activeRegion, { source });
    masksRef.current[activeRegion] = buildMask(analysis.features, source, regions[activeRegion].tolerance);
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedEffectId("custom");
      setReady(false);
      setImageSource(URL.createObjectURL(file));
    }
  };

  const handleEffectChange = (event) => {
    const option = EFFECT_OPTIONS.find((item) => item.id === event.target.value);
    if (!option) return;
    setSelectedEffectId(option.id);
    setImageSource(option.url);
    setActiveRegion(0);
    setReady(false);
  };

  const reset = () => {
    setSelectedEffectId("effectIceFire");
    setImageSource(DEFAULT_IMAGE);
    setRegions(initialRegions);
    setActiveRegion(0);
    setReady(false);
    setReloadNonce((current) => current + 1);
  };

  const changeTolerance = (index, value) => {
    const tolerance = Number(value);
    updateRegion(index, { tolerance });
    const analysis = analysisRef.current;
    if (analysis) masksRef.current[index] = buildMask(analysis.features, regions[index].source, tolerance);
  };

  return <main className="color-lab">
    <header className="color-lab-head">
      <div><p className="eyebrow">COLOR LAB / STATIC IMAGE</p><h1>静态图色区实验</h1><p className="section-subtitle">一张图、两块色区、实时颜色合成</p></div>
      <div className="color-lab-actions">
        <label className="secondary-button file-import"><Upload size={16} />载入图片<input type="file" accept="image/*" onChange={handleUpload} /></label>
        <button type="button" className="secondary-button" onClick={reset}><RotateCcw size={16} />重置</button>
      </div>
    </header>
    <div className="effect-picker">
      <label htmlFor="color-lab-effect">选择函数详情图</label>
      <select id="color-lab-effect" value={selectedEffectId} onChange={handleEffectChange}>
        <option value="custom">自定义图片</option>
        {EFFECT_OPTIONS.map((option) => <option value={option.id} key={option.id}>{option.label} · {option.id}</option>)}
      </select>
      <span>{selectedEffectId === "custom" ? "用户图片" : `${EFFECT_OPTIONS.length} 个函数详情图`}</span>
      {staticOnly ? <em className="effect-policy-note">静态保留</em> : policy ? <button type="button" className="secondary-button animation-button" onClick={() => setPlaying((current) => !current)}><>{playing ? <Pause size={15} /> : <Play size={15} />}</>{playing ? "暂停预览" : "播放预览"}<small>{policy.label}</small></button> : <em className="effect-policy-note">静态主题映射</em>}
    </div>
    <div className="color-lab-layout">
      <section className="color-lab-stage">
        <div className="color-lab-canvas-wrap">
          {!ready && <div className="color-lab-loading"><ImagePlus size={20} />正在分析图片</div>}
          <canvas ref={canvasRef} onClick={handleCanvasClick} aria-label="色区取样画布" role="img" />
        </div>
        <div className="color-lab-hint"><Palette size={15} />先选择色区，再点击图像取样；拖动右侧颜色即可实时合成</div>
      </section>
      <aside className="color-lab-controls">
        <div className="color-lab-panel-head"><strong>色区参数</strong><span>{sourceOnly ? "按原始色区做时序变化" : "主体色驱动主题"}</span></div>
        {sourceOnly ? <div className="static-notice"><ImagePlus size={19} /><strong>{staticOnly ? "该函数保留静态详情图" : selectedEffectId === "styleForest" ? "森林关键帧" : selectedEffectId === "effectRainbow" ? "彩虹循环" : selectedEffectId === "effectColorSparkle" ? "彩虹闪烁" : "色彩波动"}</strong><span>{staticOnly ? "冰火不套用通用调色。" : selectedEffectId === "styleForest" ? "关键帧来自 styleForest() 的真实仿真帧，播放时在空间灯带路径上插值；背景色区同步缓慢漂移。" : selectedEffectId === "effectColorSparkle" ? "保持每个色区原有彩虹色，只改变各灯点的明暗，模拟随机星闪。" : "多色动态不重新选色，仅改变各色区的亮度和 RGB，保持原始色彩关系。"}</span>{selectedEffectId === "styleForest" && <div className="forest-keyframes">{FOREST_KEYFRAME_INDICES.map((frame, index) => <figure key={frame}><canvas ref={(node) => { forestThumbRefs.current[index] = node; }} /><figcaption>仿真帧 {frame}</figcaption></figure>)}</div>}</div> : editableRegions.map((region, index) => <section className={`region-control ${activeRegion === index ? "active" : ""}`} key={region.id}>
          <button type="button" className="region-select" onClick={() => setActiveRegion(index)}><span className="region-dot" style={{ background: region.target }} /><strong>{region.label}</strong><small>{activeRegion === index ? "取样中" : "点击激活"}</small></button>
          <label className="color-field"><span>目标颜色</span><input type="color" value={region.target} onChange={(event) => updateRegion(index, { target: event.target.value })} /></label>
          <label className="range-field"><span>颜色容差 <b>{region.tolerance}</b></span><input type="range" min="12" max="100" value={region.tolerance} onChange={(event) => changeTolerance(index, event.target.value)} /></label>
          <code className="source-swatch"><span style={{ background: rgbToHex(region.source) }} />源色 {rgbToHex(region.source)}</code>
        </section>)}
        {!sourceOnly && <div className="color-lab-note">原始 RGB 不直接叠加；只用于结构、明暗、色区比例和渐变位置，最终颜色全部来自选定主题色。</div>}
      </aside>
    </div>
  </main>;
}
