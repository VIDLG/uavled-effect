# UAVLED Effects

Standalone source project for the UAVLED effect library and editor presets.

- `runtime/`: LED API and frame state.
- `helpers/`: reusable color, timing, math, and random functions.
- `effects/`: one built-in effect function per JavaScript file, grouped by behavior.
- `styles/`: one style function per JavaScript file.
- `presets/`: one editor preset per JSON file, grouped by the existing UI categories. A style preset's editor definition and code template live in the same JSON file.
- `compact/`: one source snippet per entry of the smaller effect-package library. These are distinct from the full prelude implementations.
- `manifest.json`: explicit source order and preset display order.

Edit files here, then run `npm run build` to assemble `dist/` locally. Run `npm run sync` to also regenerate the compatibility files in the sibling `ledjs-ai` project. Run `npm run check` to detect drift between projects, and `npm test` for structural checks. The generated files remain in `ledjs-ai` so its Rust and frontend builds do not depend on a sibling checkout at runtime.

The initial split was checked against the former aggregate files: 98 prelude functions and 44 editor presets preserve their original order and content. The `compact/` directory preserves all 15 package-builder source snippets separately.
