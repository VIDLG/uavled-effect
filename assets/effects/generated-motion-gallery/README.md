# Looping motion albums

Five image-based albums for the browser's **动效专辑** view. Forest, Ocean and Aurora each add eight generated keyframes; Cyberpunk and Matrix reuse the eight approved source-position keyframes from `../generated-keyframe-experiments/source-motion-v1/raw/`. Formal static detail images are not replaced.

Ocean and Aurora now use the selective **background-separation-v2** revision. Their earlier render mapped the same per-LED RGB onto a highly saturated background with an extra 1.35 gain, obscuring motion on the strip. The revision edits the background composition, regenerates eight source-position anchors per style, and renders the background as a darker, broader, slower field. Original neutral drone material, physical LED carrier texture, source RGB and LED coordinates are retained. Inputs, exact prompts, before/after images, generation hashes and decoded-video contrast evidence are under [`background-separation-v2/`](background-separation-v2/README.md). The catalog selects their new `*-background-v2-loop.mp4` files; original videos are retained. Other album videos are preserved byte-for-byte. Re-export only these two with `python scripts/motion_gallery.py export --styles styleOcean styleAurora`.

## Source and prompt mapping

`rules.json` is written **before** image generation. `source-frames.json` holds 257 native-JavaScript preview snapshots per style, 40 logical LEDs, 30 source FPS, with function and assembled-prelude SHA256 values. This is the browser simulator's RGB output, not Rust/mquickjs or hardware validation.

| Style | Source behavior | Image-space motion |
| --- | --- | --- |
| Cyberpunk | `(_frame*4+i*42)%512`, pink/cyan, localized glitches | Main phase advances −4/42 LEDs per source frame; background highlights travel upper-left. |
| Matrix | Independent random green triggers with brightness decay | LEDs flash/decay at fixed carriers; thematic background heads fall down. It is not a chase along the strip. |
| Forest | Two waves: `sin255(_frame*3+i*32)` and `sin255(_frame*2+i*19+80)`; occasional firefly | Green crests advance −3/32 and −2/19 LEDs per frame; luminous canopy fronts progress along curved background paths. |
| Ocean | Two waves: `sin255(_frame*3+i*30)` and `sin255(_frame*2+i*50+128)` | Blue/cyan crests advance −3/30 and −2/50 LEDs per frame, with curved background light fronts. |
| Aurora | Curtain/shimmer waves: `sin255(_frame*2+i*28)` and `sin255(_frame*3+i*17+96)` | Violet/magenta curtains progress leftward; source RGB governs the palette. |

**Aurora discrepancy:** `helpers/color/ledHsv.js` currently uses fractional `region=h/60` followed by exact integer comparisons. Most non-integer hue regions fall into the final branch in native JavaScript, yielding magenta/purple rather than the green/cyan described in the style comment. This set follows actual preview RGB and records that discrepancy. No effect/helper function was changed here.

Every panel keeps the original drone and LED carriers fixed. Source-position control sheets establish distinct motion phases; generated images supply luminous texture at those phases. The renderer registers generated panels against neutral drone features, extracts a bounded brightness-detail ratio, advects that detail forward, and uses continuous source RGB for the actual moving light regions. It does **not** play unregistered whole-image AI frames or claim exact AI trajectory fidelity. The neutral region remains byte-identical before video compression.

## Files

- `index.json`: runtime catalog selecting five H.264/yuv420p clips, 768×512, 60 FPS, 512 unique rendered frames, 8.533 seconds each. Original Ocean/Aurora MP4s are also retained beside their selected background-v2 replacements.
- `posters/*.jpg`, `keyframes/*.jpg`: browser covers and eight seek thumbnails per effect. The browser imports only these and the MP4 URLs, not generation intermediates.
- `controls/`: source-position 2×2 storyboards and numbered calibration images. `references/`: the existing series identity for each new style. `calibration.json`: two mirrored 40-point image-space LED paths.
- `prompts/*.txt`: exact unaugmented image-edit prompts; `raw/*.png`: six new API outputs, four panels per sheet.
- `generation.json`: model **gpt-image-2.5-flare**, image-edit settings, actual input/output paths and hashes. Configured `OpenAI()` credentials are used by the official imagegen CLI and are not stored here.
- `*-keyframes.jpg`: eight-frame contact sheets; `*-space-time.png`: rendered left-strip position versus time.
- `verification.json`: pre-compression neutral differences, alignment estimates, adjacent-frame and final-to-first differences. These are numeric checks, not physical-device acceptance.

## Loop handling and limits

Playback always advances forward. The final 12 source frames (0.4 seconds) blend RGB back toward the initial state so random/glitch effects can repeat. Matrix also blends its nonperiodic background head state during that join. Generated texture wraps into the first anchor using a forward segment; there is no ping-pong reversal. This short closure is a **presentation adjustment**, not an assertion that each original function naturally repeats after 256 frames. Last-to-first MAE is recorded, not assumed to be zero; exact endpoint identity alone would not establish seam quality.

The source snapshots are 30 FPS; 60 FPS output interpolates neighboring RGB states and transported detail. MP4 rate does not guarantee 60 FPS on every phone. Background light-front motion is a thematic image mapping of LED phase; it is not literal 3D emitted-light simulation. These files are fixed-palette prerecorded albums; real-time parameter recoloring remains a separate Color Lab capability.

## Reproduce

From the repository root (Python packages: numpy, Pillow, opencv-python; ffmpeg on PATH):

```powershell
npm run build
node scripts/prepare-motion-gallery.mjs
python scripts/motion_gallery.py prepare
```

For Forest, Ocean and Aurora, generate batches `00` and `01` with the configured official imagegen CLI. Replace `<style>` and `<batch>` below; the command is an image **edit** with the matching two references, not text-only generation:

```powershell
python C:/Users/clf20/.codex/skills/.system/imagegen/scripts/image_gen.py edit --model gpt-image-2.5-flare --image assets/effects/generated-motion-gallery/controls/<style>-<batch>.png --image assets/effects/generated-motion-gallery/references/<style>.png --prompt-file assets/effects/generated-motion-gallery/prompts/<style>-<batch>.txt --size 1536x1024 --quality high --out assets/effects/generated-motion-gallery/raw/<style>-<batch>.png --force --no-augment
python scripts/motion_gallery.py export
python -m unittest discover -s tests -p 'test_*motion*.py'
npm test
npm run sim:build
npm run sim:dev
```

Open the URL printed by Vite with `/?view=motion`. In another terminal, `node scripts/test-motion-gallery-browser.mjs http://localhost:5173` runs actual Edge/Playwright media checks (substitute the actual port). Screenshots, observed frame-callback rates and browser verification are saved under ignored `tmp/motion-gallery/`. Checks cover decoding, forward playback, native loop wrap, pause/seek, switching, lazy MP4 loading, mobile overflow, reduced-motion manual playback, and release when leaving the view.
