## Joined guard repair (v6)

The v5 rail was pixel-connected but its caps did not follow the original molded guard. V6 replaces that sampled rail with bounded neutral perimeter edits from `gpt-image-2.5-flare`. The repair region continues past the first/last LED into all four upper-diagonal/lower-corner joins; ending it at the light path would cut a new notch. The central drone outside these bounds stays exact. No LEDs are generated into the repaired material.

Selected shared foregrounds are `shared/rim-*-v6.png`. The original dense emitter texture, bead count and coordinates retain the existing 6-pixel exterior translation at 768×512. Native RGB/timing and the generated background motion are preserved. The nine video albums select `generated-motion-gallery/rim-v6/`; Rainbow selects versioned v6 base/map assets. Legacy frame compositing erases superseded silhouette fragments before restoring the repaired guard.

`rim-v6/generation.json` records the CLI model, input/output hashes, exact prompt paths and compositing rules. Each style folder contains edit target, mechanical reference and output. Aurora has recorded cleanup edits removing stray rectangular tabs at the upper and lower corners. `join-comparison.png`, `all-joins.jpg` and `all-guards.jpg` document visual inspection; the browser ON/OFF screenshots and `browser-off-corner.png` document the actual WebGL view. `all-geometry.json` records pixel connectivity separately from visual evidence. These are image-space checks, not CAD/hardware validation.

Reapply with `python scripts/apply_outer_rim.py atlas`, `videos`, and `rainbow`. The preserved `rim-v5/original-catalogs.json` points to original inputs, so corrections never compound earlier versions. Test with `node scripts/test-outer-rim-browser.mjs http://localhost:5173`: fixed guard pixels must remain identical across ON/OFF and the original dense external beads must still illuminate. Python regression checks ensure repair coverage continues beyond emitter endpoints and original pixels outside the perimeter edit remain exact. `python scripts/inspect_outer_rim.py` rebuilds the hash manifest and geometry sheets. A single historical video can be re-exported with `videos --style styleAurora`. All prior revisions remain historical evidence.

## Rendering and generation

Every new entry shares the approved neutral illustrated drone, original dense emitter footprints and physical strip calibration from the Neon foreground v3. Generated background drones/LEDs are removed before playback. V6 separately uses a bounded neutral AI perimeter repair; the dense emissive texture remains the original. `shared/profile.png` preserves original RGB maximum/minimum plus discrete bead and continuous strip coordinates; `shared/masks.png` separates actual body silhouette, light support and soft exterior contrast. Original bright-core Voronoi cells control color without shrinking their displayed footprints. The neutral drone stays fixed while corresponding light zones change.

`sourceAtlasMotion.js` reads native 40-LED RGB snapshots at 30 FPS and interpolates them at display cadence. Each selected effect loads six textures, with the three foreground textures shared/cached. There is one active renderer; switching disposes its GPU resources. Single-image flash/flow needs no stack of RGB image layers. This is fixed-preset album playback: changing a preset call requires rebuilding its source atlas, and there are no new runtime color-parameter controls here.

22 spatial functions use genuinely generated exterior background phases, four per function. Traveling heads/fronts have different anchor positions; interpolation transports scenery forward, radial effects expand/contract, and actual bounce effects reverse. The generated foreground is removed before compositing the fixed drone. The other 24 entries use one existing album artwork with source-index color/intensity changes, including static Solid. The standard detail set and previous MP4/Rainbow variants remain archived; selected geometry uses the versioned v6 assets above.

Model: `gpt-image-2.5-flare`, official imagegen fallback CLI (`image_gen.py edit`) through the user-configured OpenAI API. `mapping.json` and `generation-plan.json` are written before API requests. Final prompts, input hashes, source-frame offsets and generated output hashes are saved. Fire/IceFire and single-color Sparkle capture native states after 256 warm-up frames; this avoids replaying the cold startup at every loop. For these spatial-effect requests the API renders backgrounds; the separately recorded v6 edit repairs neutral guard material. Source RGB determines the actual LEDs.

## Files

| Location | Purpose |
| --- | --- |
| `index.json` | Selected runtime entries, timing and asset paths |
| `verification.json` | Coverage/test counts, browser checks and explicit validation limits |
| `mapping.json` | Calls, source excerpts/hashes, behavior, frame windows, warm-up and static/one-shot policies |
| `traces/` | Exact native JavaScript RGB snapshots, source/prelude hashes and calls |
| `shared/` | Neutral drone, original emitter profile and actual silhouette masks |
| `sources/` | 40 × frame-count RGB lookup textures |
| `scenes/`, `zones/` | Existing artwork backgrounds and source-index region maps for single-image playback |
| `backgrounds/` | Four cleaned generated exterior scenes in a 2×2 atlas per spatial effect |
| `posters/`, `keyframes/` | Selected poster and clickable anchor previews; generated scenes use final generated backgrounds |
| `controls/`, `references/` | Exact source-controlled storyboard and fixed series input supplied to image generation |
| `prompts/` | Complete final prompts, one per generated spatial sequence |
| `raw/` | Unmodified image-generation outputs; not requested by the browser |
| `generation-plan.json`, `generation.json` | Planned requests and completed generation provenance |
| `previews/` | Actual browser canvas recordings (MP4) and desktop draw-cadence evidence |

## Source fidelity and limits

Native JavaScript execution takes precedence over function names and comments. Police flashes the logical upper/lower halves on both mirrored strips, rather than physical left versus right. Color Sparkle uses rainbow births and individual RGB decay. The IceFire source uses a blue heat map, rather than an invented orange/blue split. Fractional HSV branches, retained writes and noninteger LED writes can differ from the integer Rust/mquickjs runtime: for example, native Bounce has intermittent dropped writes, while RainbowWave is not rendered as a rainbow. This task does not repair source effects/helpers.

Static Solid never animates. One-shot effects end/hold and can replay; they are not made into artificial back-and-forth loops. Stochastic sampled clips repeat a finite native RGB window and are not an indefinitely evolving simulation. Generated background interpretation is illustrative; physical strip RGB/positions remain source-controlled. Four background anchors do not constitute generated 60-FPS footage; live shader interpolation provides intermediate display frames.

## Reproduction and checks

Run from the repository root:

```powershell
npm run build
node scripts/prepare-source-atlas.mjs
python scripts/source_atlas_assets.py prepare
# Run the official imagegen CLI for each generation-plan.json request, e.g.:
python C:/Users/clf20/.codex/skills/.system/imagegen/scripts/image_gen.py edit --model gpt-image-2.5-flare --image assets/effects/source-atlas-motion/controls/effectChase.png --image assets/effects/source-atlas-motion/references/effectChase.png --prompt-file assets/effects/source-atlas-motion/prompts/effectChase.txt --size 1536x1024 --quality high --out assets/effects/source-atlas-motion/raw/effectChase.png --no-augment
python scripts/source_atlas_assets.py finish
npm test
python -m unittest discover -s tests -p 'test_*.py'
npm run sim:build
node scripts/test-source-atlas-browser.mjs http://localhost:4173
node scripts/test-motion-gallery-browser.mjs http://localhost:4173
node scripts/record-source-atlas-preview.mjs http://localhost:4173
```

Do not rerun preparation over a reviewed set unless intentionally revising its assets: changed source calls/hashes or controls require fresh generation and provenance. API keys stay in the configured environment, outside source/logs.

Browser checks cover all 46 new entries, actual phase differences, unchanged neutral body, pause/seeking, static Solid, one-shot fade completion/replay, one active canvas, selected-texture loading, mobile width and reduced-motion/manual play. All 46 new browser entries passed; the nine existing videos passed their separate regression, and existing Rainbow passed playback/pause/original-comparison/switching checks. 21 JavaScript and 20 Python image checks passed. Three actual canvas recordings observed about 60 draws/s in desktop headless Edge (P95 interval 17 ms); see `previews/capture.json`. Numeric tests verify complete 56-function coverage, exact cached source RGB, input/output hashes, unchanged original LED texture/support and distinct generated background phases. These are desktop browser/source checks, not real-phone performance or hardware acceptance. Visual motion direction still needs human review alongside these checks.

## Per-function coverage

The existing nine MP4 albums are Cyberpunk, Matrix, Forest, Ocean, Aurora, Lava, Galaxy, Neon and Heartbeat; `effectRainbow` keeps its existing single-image renderer. New entries:

| Function | Name | Playback | Generated background anchors | Warm-up frames |
| --- | --- | --- | --- | --- |
| `effectSolid` | 纯色 | Static | 0 | 0 |
| `effectStudySegment` | 学习分段 | One-shot / hold | 0 | 0 |
| `effectPlanSegment` | 计划分段 | One-shot / hold | 0 | 0 |
| `effectChase` | 单点追逐 | Spatial loop | 4 | 0 |
| `effectMeteor` | 流星 | Spatial loop | 4 | 0 |
| `effectMeteorRain` | 流星雨 | Spatial loop | 4 | 0 |
| `effectFire` | 火焰 | Spatial loop | 4 | 256 |
| `effectIceFire` | 冰火 | Spatial loop | 4 | 256 |
| `effectLightning` | 闪电 | Single-image full-lit flow | 0 | 0 |
| `effectPulse` | 中心脉冲 | Spatial loop | 4 | 0 |
| `effectCenterExpand` | 中心扩散 | One-shot / hold | 4 | 0 |
| `effectCenterContract` | 中心收缩 | One-shot / hold | 4 | 0 |
| `effectDampedRebound` | 阻尼回弹 | One-shot / hold | 4 | 0 |
| `effectTendril` | 藤蔓伸展 | One-shot / hold | 4 | 0 |
| `effectBubble` | 气泡漂移 | One-shot / hold | 4 | 0 |
| `effectBreathe` | 呼吸渐变 | Single-image full-lit flow | 0 | 0 |
| `effectFade` | 淡入淡出 | One-shot / hold | 0 | 0 |
| `effectDirectionalTrail` | 定向拖尾 | Spatial loop | 4 | 0 |
| `effectDirectionalWipe` | 定向擦除 | One-shot / hold | 4 | 0 |
| `effectDirectionalTendril` | 定向藤蔓 | One-shot / hold | 4 | 0 |
| `effectMultiChase` | 多点追逐 | Spatial loop | 4 | 0 |
| `effectMultiChaseTail` | 多点拖尾 | Spatial loop | 4 | 0 |
| `effectWave` | 正弦波浪 | Single-image full-lit flow | 0 | 0 |
| `effectDualWave` | 双色波浪 | Single-image flash / RGB | 0 | 0 |
| `effectSparkle` | 单色闪烁 | Single-image full-lit flow | 0 | 256 |
| `effectColorSparkle` | 彩虹闪烁 | Single-image flash / RGB | 0 | 0 |
| `effectTwinkle` | 星光 | Single-image flash / RGB | 0 | 0 |
| `effectComet` | 彗星 | Spatial loop | 4 | 0 |
| `effectBounce` | 反弹 | Spatial loop | 4 | 0 |
| `effectBounceTail` | 反弹拖尾 | Spatial loop | 4 | 0 |
| `effectTheaterChase` | 剧院追逐 | Single-image flash / RGB | 0 | 0 |
| `effectGradient` | 渐变滚动 | Single-image full-lit flow | 0 | 0 |
| `effectStack` | 堆叠 | Spatial loop | 4 | 0 |
| `effectScanner` | 扫描 | Spatial loop | 4 | 0 |
| `effectRipple` | 涟漪 | Single-image full-lit flow | 0 | 0 |
| `effectPlasma` | 等离子 | Single-image full-lit flow | 0 | 0 |
| `styleVaporwave` | 蒸汽波 | Single-image full-lit flow | 0 | 0 |
| `styleSunset` | 日落 | Single-image full-lit flow | 0 | 0 |
| `styleCandlelight` | 烛光 | Single-image full-lit flow | 0 | 0 |
| `styleMoonlight` | 月光 | Single-image full-lit flow | 0 | 0 |
| `styleArcade` | 街机 | Single-image full-lit flow | 0 | 0 |
| `stylePolice` | 警灯 | Single-image flash / RGB | 0 | 0 |
| `styleChristmas` | 圣诞 | Single-image full-lit flow | 0 | 0 |
| `effectStrobe` | 频闪 | Single-image flash / RGB | 0 | 0 |
| `effectColorWipe` | 颜色擦除 | Spatial loop | 4 | 0 |
| `effectRainbowWave` | 色彩波动 | Single-image full-lit flow | 0 | 0 |
