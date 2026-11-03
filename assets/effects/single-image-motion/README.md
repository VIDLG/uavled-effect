# Single-image color flow

The **彩虹循环** album in **动效专辑** renders live from one existing artwork. Open the local Vite URL with `/?view=motion&effect=effectRainbow`. It supports pause, forward looping, seeking and **原图对照**. It downloads no video and plays no generated frame sequence.

## Why this effect fits

`effects/rainbow/effectRainbow.js` computes `wheelRgb(_frame*speed + i*768/count)`. At speed 3 and 30 source FPS, the full color field translates forward one cycle every 256 source frames (8.533 seconds). All 40 logical LEDs remain lit: the sampled minimum peak channel is 127/255, and there are zero off LED states across the cycle. Each mirrored physical strip follows the same logical sequence.

The light carriers, white emitter cores and artwork texture stay fixed. Only the color-field phase advances. This is suitable for full-lit repeating color bands and scrolling gradients. A moving head whose bright footprint or trail shape changes still needs a moving spatial field or distinct generated anchors; a phase shift alone does not recover those shapes. Rainbow **sparkle** has independent random per-LED states and must not be mapped to this ordered cycle.

## Mapping and files

- `index.json`: function/prelude hashes, source call, exact 256×RGB native-JavaScript samples, full-lit checks, and source-to-image rules. Snapshot zero already includes `tick()`.
- `effectRainbow-base.png`: the existing series detail resized to 768×512, without new generation. About 0.78 MB.
- `effectRainbow-phase.png`: one auxiliary **data map**, not an alternate artwork or animation frame. RG carries a big-endian 16-bit phase (10 meaningful bits); B is the color-zone weight. About 0.45 MB. Phase quantization is below one raw color-wheel unit.
- `effectRainbow-palette.png`: the native source RGB lookup, 256×1 pixels, 92 bytes. It repeats and interpolates continuously.
- `effectRainbow-poster.jpg`: playlist cover. `calibration.json` and `effectRainbow-calibration.jpg`: mirrored 40-point LED calibration.

Inside the LED halos the map stores the calibrated logical coordinate `i/40`. In the background, the original image's chromatic mixture is inverted along the source wheel's R→G→B→R edges to recover a phase. Equal phases receive the same color change, preserving the original arrangement of color regions. Phase transitions are interpolated on a circle to avoid a false color jump at red. This background map is an artistic correspondence, not a 3D light simulation or a claim that every generated reflection has a unique physical LED origin.

At runtime `simulator/src/singleImageMotion.js` adds a global time phase, looks up source RGB, and reconstructs each colored pixel using its existing value/saturation texture. It retains the wheel's intrinsic RGB intensity variation and adds no blink envelope. Color replacement is complete inside selected zones; mask blending only feathers spatial boundaries. Neutral body/propeller material is protected. White cores remain bright. Source brightness/power controls still come from the sampled native-JavaScript source; this is not Rust/mquickjs or hardware validation.

There is one draw call and one time-uniform update per animation frame. The three immutable textures are uploaded once, approximately **1.23 MB compressed total**, rather than loading many color layers or a temporal frame stack. GPU storage is larger than compressed PNG size. React progress updates are limited to 10 Hz; image animation follows `requestAnimationFrame`. Hidden pages suspend time advancement. No mobile native-app renderer or real-device performance claim is implied by the mobile-width browser check.

## Reproduce and verify

```powershell
npm run build
node scripts/prepare-single-image-motion.mjs
python scripts/prepare_single_image_motion.py
npm test
npm run sim:build
npm run sim:dev
node scripts/test-single-image-browser.mjs http://localhost:5173
```

Python needs numpy, Pillow and opencv-python; the browser check uses installed Edge through Playwright. Substitute the actual Vite port. It checks actual changing pixels, paused pixel stability, original-image comparison, forward loop/seek, absence of media downloads while this album is selected, GPU/CPU color agreement, exact neutral-pixel protection, cycle endpoint identity, previous-video switching and mobile overflow. Screenshots and the numeric report are under ignored `tmp/single-image-motion/`. The GPU benchmark is a short desktop-browser measurement, not a phone or sustained-load guarantee.
