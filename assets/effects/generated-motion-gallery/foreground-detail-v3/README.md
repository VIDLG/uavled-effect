# Original emitter form and natural scene boundary

This corrects the foreground regression in `motion-detail-v2`; its generated moving RGB backgrounds are reused. There are **no new image generation calls** in this correction. Heartbeat and the other albums keep their existing videos.

The original LED points had the correct size and locations. V2's high-pass display texture compressed them into tiny saturated dots, while a convex foreground mask and the dark 24 px background collar created a plate beside the strips. Replacing the background also removed source-image bloom that the old strip feather had relied on.

- Original image RGB maximum/minimum profiles are retained at exactly the same pixels, preserving emitter footprints, neutral bright cores and colored bloom. Landmarks detected in the original cores only assign color cells; detection does not replace, threshold, shrink or move the displayed texture.
- Each bright core receives one source LED color. Neighboring source states blend in diffuse glow and gaps. Original neutral highlights remain neutral; native source RGB drives chromatic light and brightness. The display response is documented in `render.json` and source-off light is exactly zero.
- `masks/` stores an actual connected drone silhouette with a subpixel edge feather. It follows the concave guard contours instead of exposing a convex wing-like plate. The original filled rotor interiors remain fixed; this is an artwork composition, not physical scene relighting or geometric animation.
- Near-strip contrast uses a gradual 3–36 px rolloff, replacing the flat 24 px dark collar. Complete original glow support is restored where the new background would otherwise detach the lights from their carrier.
- Eight previously generated full-color background phases per album and forward temporal interpolation remain active. Their image-generation prompts, exact API input images and hashes stay under `../motion-detail-v2/`.

Selected runtime videos: `../styleLava-foreground-v3-loop.mp4`, `../styleGalaxy-foreground-v3-loop.mp4`, `../styleNeon-foreground-v3-loop.mp4`. The catalog selects these files with a new revision tag, updating media caches. All previous loop files remain available. `before/` holds V2 posters; `comparison.jpg` compares original artwork, V2 and this correction. `render.json` records the processing rules and input/matte hashes.

Re-export saved inputs with:

```
python scripts/motion_gallery.py export --styles styleLava styleGalaxy styleNeon
```

`python scripts/album_foreground_v3.py` regenerates the saved mattes from the original artwork using fixed GrabCut seeds. Do not regenerate historical `motion-detail-v2` controls or prompts for this renderer-only correction.

Validation includes unchanged original brightness/neutral-highlight footprint, source-off, source chromatic values at observed cores, fixed material pixels, forward RGB background transport, loop boundaries, actual browser playback and mobile-width layout. `browser-verification.json` and `motion-verification.json` record runtime evidence. These checks do not replace user visual acceptance or physical-device testing.
