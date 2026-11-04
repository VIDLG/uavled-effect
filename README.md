# UAVLED Effects

Standalone source project for the UAVLED effect library and editor presets.

- `runtime/`: LED API and frame state.
- `helpers/`: reusable color, timing, math, and random functions.
- `effects/`: one built-in effect function per JavaScript file, grouped by behavior.
- `styles/`: one style function per JavaScript file.
- `presets/`: one editor preset per JSON file, grouped by the existing UI categories. A style preset's editor definition and code template live in the same JSON file.
- `function-names.json`: display names for extracted functions that do not have an editor preset; API function identifiers remain unchanged.
- `compact/`: one source snippet per entry of the smaller effect-package library. These are distinct from the full prelude implementations.
- `manifest.json`: explicit source order and preset display order.

Edit files here, then run `npm run build` to assemble `dist/` locally. Run `npm run sync` to also regenerate the compatibility files in the sibling `ledjs-ai` project. Run `npm run check` to detect drift between projects, and `npm test` for structural checks. The generated files remain in `ledjs-ai` so its Rust and frontend builds do not depend on a sibling checkout at runtime.

The initial split was checked against the former aggregate files: 98 prelude functions and 44 editor presets preserve their original order and content. The `compact/` directory preserves all 15 package-builder source snippets separately.

## Visual assets and dynamics

Lava/Galaxy/Neon now select `*-foreground-v3-loop.mp4`. The original LED footprints and softer scene boundary are restored; correction rules, masks and comparisons are in `assets/effects/generated-motion-gallery/foreground-detail-v3/`. Moving RGB background phases, exact image-generation prompts and source mapping remain in `assets/effects/generated-motion-gallery/motion-detail-v2/`. Heartbeat retains its approved single-artwork rendering.

The motion gallery now includes four additional albums: Lava, Galaxy, Neon and Heartbeat. Their source mapping, prompts, generation provenance and calibration are in `assets/effects/generated-motion-gallery/motion-expansion-v1/`. Aurora's corrected independent strip paths and calibration evidence are in `assets/effects/generated-motion-gallery/calibration-v4/`; its selected video is `styleAurora-calibrated-v4-loop.mp4`.

The reusable image assets are committed under `assets/` and are grouped by purpose:

| Category | Location | Contents |
| --- | --- | --- |
| Standard detail images | `assets/effects/generated-details/` | One detail PNG per effect or style preset. `simulator/src/ColorLab.jsx` loads this set for the color and animation preview. |
| Geometric album-cover variants | `assets/effects/generated-details-geometric/` | The alternate geometric background set, with its source mapping in `index.json`. |
| Static animation samples | `assets/effects/generated-frames/` | Three representative simulated frames per effect or style, named `<id>-030.png`, `<id>-090.png`, and `<id>-150.png`. These are visual samples, not runtime playback files. |
| Image 2.5 keyframe candidates | `assets/effects/generated-keyframe-experiments/image-2.5/` | Cyberpunk and Matrix experiments comparing `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst`: source controls, exact prompts, four generated keyframes, GIF/MP4 comparisons, and limitations. |
| Flare 16-frame motion candidates | `assets/effects/generated-keyframe-experiments/flare-dense16/` | Cyberpunk and Matrix with 16 generated keyframes each, source samples every two frames, aligned/fixed inner drone, 15 unique FPS previews, and four-versus-sixteen-frame comparisons. See the local README for reproduction and remaining batch transitions. |
| Source-position keyframes and motion | `assets/effects/generated-keyframe-experiments/source-motion-v1/` | Eight newly generated keyframes per style at distinct motion phases; source-constrained positions, forward RGB transitions, 60 FPS video, and rendered-versus-source space-time evidence. Addresses the oscillation found in the denser free-generated sequence. |
| Looping motion albums | `assets/effects/generated-motion-gallery/` | Nine prerecorded MP4 albums, including Cyberpunk, Matrix, Forest, Ocean, Aurora, Lava, Galaxy, Neon and Heartbeat. Ocean/Aurora use `*-background-v3-loop.mp4`, with richer outer-scene layers and a quiet strip surround. Mapping, prompts, generation inputs and v2/v3 comparison are in `background-depth-v3/`; previous videos remain available. Played by `simulator/src/MotionGallery.jsx`; see the local README for reproduction and source-preview limitations. |
| Single-image color flow | `assets/effects/single-image-motion/` | Rainbow cycle driven live from one fixed artwork, a phase/mask atlas and a 256×1 source RGB lookup. This album uses a WebGL shader, with no video or generated keyframe sequence. See its local README for source mapping and limits. |
| New source-driven albums | `assets/effects/source-atlas-motion/` | 45 live dynamics plus static Solid; 22 generated background sequences, shared original drone/LED profiles, native RGB atlases, complete prompts/provenance and actual browser recordings. |
| Ice-fire source material | `assets/effects/ice-fire/` | Ice-fire detail images, metadata, and the original source frames under `source-frames/`. |
| Red-blue alert variants | `assets/effects/red-blue-alert/` | The alert detail image and its thumbnail/background variants. |
| Neo2 chibi variants | `assets/effects/neo2-chibi/` | Generated icon and illustration variants for the drone subject. |

The dynamic behavior remains source-controlled alongside the presets:

- `effects/<category>/*.js`: runtime LED effect functions. Categories include `basic`, `composition`, `motion`, `waves`, `flashes`, `trails`, `ambience`, and the compatibility `rainbow` folder.
- `styles/*.js`: named style functions such as `styleForest()`.
- `presets/<category>/*.json`: display names, categories, function calls, colors, and editor controls for each effect.
- `simulator/src/ColorLab.jsx`: static-image color mapping, effect-specific preview policies, and the Forest keyframe interpolation preview.
- `simulator/src/simulate.js` and `simulator/src/topology.js`: frame simulation and drone LED topology used by the previews.

The rainbow mappings are kept explicit: `effectRainbow` is **彩虹循环** (ordered hue progression), while `effectColorSparkle` is **彩虹闪烁** (random rainbow colors with independent point brightness decay). The Color Lab preserves those source hues and only animates the corresponding color zones. `styleForest()` uses nine simulated keyframes and a synchronized, low-frequency background drift.

The two rainbow detail images are reference-image edits using `gpt-image-2`, preserving the existing series drone and background treatment. Their exact prompts, reference image, and source-to-visual rules are saved under `assets/effects/prompts/` in `rainbow-series-mapping.json`. A function's palette and spatial behavior change the lighting and background rhythm; they must not redesign the drone or change the series style.

The `tmp/` directory contains local screenshots, browser recordings, and generation intermediates. It is evidence for development and is intentionally separate from the committed reusable assets.

Open **动效专辑** in the top navigation, or append `/?view=motion` to the local Vite URL. All **56 built-in effect/style functions** now have a selected album: the existing nine MP4 albums and single-image Rainbow, plus **45 new live dynamics and one static Solid**. The 22 new spatial sequences have four generated background anchors each; the other 24 new entries use one artwork with source-controlled color/intensity (including static Solid). The player keeps the approved fixed drone and dense original LED footprints. Only the selected renderer/media loads. Static Solid has no fake blink; one-shot functions end and can replay; periodic functions loop. Reduced-motion preferences disable autoplay.

The new set, per-function coverage, source-to-prompt rules, complete prompts and generation provenance are in [`assets/effects/source-atlas-motion/README.md`](assets/effects/source-atlas-motion/README.md). Runtime assets are `shared/`, `scenes/`, `sources/`, `zones/`, `backgrounds/`, `posters/` and `keyframes/`; `raw/`, `controls/`, `references/`, `prompts/` and `traces/` preserve generation and source evidence. Source RGB is sampled at 30 FPS and interpolated at browser display cadence. This describes an album preview, not physical-device or Rust/mquickjs validation. The standard detail-image set and existing selected MP4/Rainbow assets are preserved.

## Skia Web simulator

On Windows, double-click `start-simulator.cmd` in this folder. It installs dependencies if needed, starts the local service, and opens the simulator after the service is ready. Keep its console window open while using the simulator; closing it stops the service. To start manually, install dependencies with `npm install`, run `npm run sim:dev`, and open the URL printed by Vite. **编译器** accepts `project-scripts/*.ts` and `*.js`, a local file, or pasted code. Compile a script containing `function update()` and send its JS output to **模拟器**. The simulator also lists built-in effects and files already present under `compiled/`. The simulator renders the drone image with React Native Skia Web and projects 40 logical LEDs to 80 physical positions using the copied hardware topology profile. Search and category filters, playback controls, frame seeking, speed selection, and the **显示全部灯位** calibration view are available.

Add new project scripts under `project-scripts/`. Vite discovers them during development; rebuild the static site after adding files for production. Use the two tools independently when an output file is needed:

```powershell
npm run tool:compile -- --file project-scripts/wing-chase.ts
npm run tool:simulate -- --artifact compiled/wing-chase.js --frames 120
```

`compile_effect` and `simulate_effect` are also separate MCP tools from `npm run mcp:serve`. The project-scoped `.codex/config.toml` registers them when this repository is opened as a trusted Codex project. `compile_effect` accepts either `file` (under `project-scripts/`) or `code`, plus an optional artifact `name`; `simulate_effect` accepts an `artifact` under `compiled/` and `frames` (1-240). Compilation writes `compiled/<name>.js`; simulation writes `simulations/<name>.json`. The sample `compiled/wing-chase.js` is ready to simulate after cloning.

`npm run sim:build` creates a static site in `simulator-build/`; `npm run sim:preview` serves that build locally. The TypeScript compiler transpiles and syntax-checks a self-contained `update()` script; built-in LED functions are available during simulation. Browser workers evaluate the assembled JavaScript prelude for 240 frames at a nominal 30 FPS. This is a visual preview of script output, not a test of the desktop Rust/mquickjs compiler, BLE transport, or physical LED calibration. Run only scripts you trust. Changes to the drone image or topology in `ledjs-ai` must be copied to `simulator/public/drone.png` and `simulator/src/hardware-profile.json` respectively before publishing a matching preview.
