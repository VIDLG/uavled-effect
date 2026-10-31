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

## Skia Web simulator

On Windows, double-click `start-simulator.cmd` in this folder. It installs dependencies if needed, starts the local service, and opens the simulator after the service is ready. Keep its console window open while using the simulator; closing it stops the service. To start manually, install dependencies with `npm install`, run `npm run sim:dev`, and open the URL printed by Vite. **编译器** accepts `project-scripts/*.ts` and `*.js`, a local file, or pasted code. Compile a script containing `function update()` and send its JS output to **模拟器**. The simulator also lists built-in effects and files already present under `compiled/`. The simulator renders the drone image with React Native Skia Web and projects 40 logical LEDs to 80 physical positions using the copied hardware topology profile. Search and category filters, playback controls, frame seeking, speed selection, and the **显示全部灯位** calibration view are available.

Add new project scripts under `project-scripts/`. Vite discovers them during development; rebuild the static site after adding files for production. Use the two tools independently when an output file is needed:

```powershell
npm run tool:compile -- --file project-scripts/wing-chase.ts
npm run tool:simulate -- --artifact compiled/wing-chase.js --frames 120
```

`compile_effect` and `simulate_effect` are also separate MCP tools from `npm run mcp:serve`. The project-scoped `.codex/config.toml` registers them when this repository is opened as a trusted Codex project. `compile_effect` accepts either `file` (under `project-scripts/`) or `code`, plus an optional artifact `name`; `simulate_effect` accepts an `artifact` under `compiled/` and `frames` (1-240). Compilation writes `compiled/<name>.js`; simulation writes `simulations/<name>.json`. The sample `compiled/wing-chase.js` is ready to simulate after cloning.

`npm run sim:build` creates a static site in `simulator-build/`; `npm run sim:preview` serves that build locally. The TypeScript compiler transpiles and syntax-checks a self-contained `update()` script; built-in LED functions are available during simulation. Browser workers evaluate the assembled JavaScript prelude for 240 frames at a nominal 30 FPS. This is a visual preview of script output, not a test of the desktop Rust/mquickjs compiler, BLE transport, or physical LED calibration. Run only scripts you trust. Changes to the drone image or topology in `ledjs-ai` must be copied to `simulator/public/drone.png` and `simulator/src/hardware-profile.json` respectively before publishing a matching preview.
