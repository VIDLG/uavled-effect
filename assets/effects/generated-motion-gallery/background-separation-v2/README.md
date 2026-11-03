# Ocean / Aurora background separation

The previous full-frame backgrounds repeated local LED colors and phases at comparable or greater intensity. `AlbumField.render()` also applied a 1.35 background gain. Cyan and magenta light sections blended into their immediate context, making strip movement hard to read.

This revision changes **background composition and hierarchy** while retaining the original LED signal:

- **Ocean:** ink/navy water, fine blue/cyan tide contours at the outer corners; calm lower-contrast water directly beside the bands.
- **Aurora:** cold midnight-indigo/blue-violet atmosphere, slender distant curtains at the top and outer edges; the actual source's magenta foreground LEDs remain vivid.
- **Both:** background local color arrangement is independent of individual LED sections. Broad background fronts complete one slow 8.533-second cycle. The background's maximum RGB is capped at 28/255 beside the strip and rises smoothly to 110/255 at 100 pixels, after generated texture is applied. This is a soft spatial hierarchy, not a hard black cutout or erased center.

The current native-JavaScript Aurora source still outputs predominantly magenta due to the existing `ledHsv` branch behavior documented in the parent README. This revision does not alter that helper or any effect function.

## Generation and composition

`rules.json` and `background-prompts/` are saved before generation. The model remains the user-selected **gpt-image-2.5-flare**, configured through the official imagegen CLI / `OpenAI()` environment.

1. Two background-only image edits use the original series details in `references/`; outputs are in `background-raw/`.
2. `scripts/album_background.py compose` registers the edited scene against the original neutral drone, restores the original neutral material and physical band texture, and saves `bases/` plus feathered scene masks in `masks/`. There is no whole-drone image warp during playback.
3. Four revised 2×2 source-position storyboards and exact prompts are saved in `controls/` and `prompts/`. The eight anchor times remain 0, 32, …, 224 at 30 source FPS. Their four new AI outputs are in `raw/`.
4. The renderer uses the revised background's own color arrangement with a broad low-amplitude front. It no longer projects local LED RGB over the scene. Generated details supply bounded transported texture; the actual strip still follows the unchanged source RGB, calibration, exposure and original emitter texture.
5. Ocean and Aurora use new `*-background-v2-loop.mp4` files, with updated posters, seek thumbnails and contact/space-time images in the parent folder. Versioned media avoids replacing an old video that Windows may deny access to. Catalog revision tags refresh existing browser image/media URLs. The original videos and historical v1 generation inputs remain intact.

`generation.json` records six new API outputs (two backgrounds and four keyframe sheets), exact input/output paths and hashes. The parent `generation.json` preserves the original requests and links this revision. No API credentials are saved.

## Evidence

- `before/` and `comparison.jpg`: previous and current posters.
- `before-hashes.json`: hashes of all five original video files. `contrast-verification.json` verifies the other three videos stayed unchanged.
- `contrast-baseline.json` and `contrast-verification.json`: measurements from eight **decoded video** times per style. The local metric is mean Rec709-weighted RGB at 80 calibrated LED centers divided by mean at 25 pixels outward plus one. It checks visual separation numerically; it is not a human-study visibility score.
- `tests/test_album_background.py`: local contrast bounds, separation from local LED color sections, exact retention of the original core LED signal when generated texture is absent, neutral-region protection, and the background loop cap.
- The parent `verification.json` retains frame count, loop join and pre-compression neutral-pixel checks. Video compression can introduce small differences and is not covered by a byte-exact pre-compression assertion.

## Reproduce

From the repository root:

```powershell
python scripts/album_background.py prepare
```

For each of `styleOcean` and `styleAurora`, run the official imagegen CLI's `edit` operation using `references/<style>.png`, `background-prompts/<style>.txt`, model `gpt-image-2.5-flare`, size `1536x1024`, quality `high`, and `--no-augment`; save to `background-raw/<style>.png`. Then:

```powershell
python scripts/album_background.py compose
python scripts/album_background.py controls
```

Generate batches `00` and `01` for each style with `controls/<style>-<batch>.png` as the first image, `bases/<style>.png` as the second, and the matching `prompts/<style>-<batch>.txt`. Use the same model/settings and save to `raw/<style>-<batch>.png`. The exact paths/hashes for the delivered generation are in `generation.json`.

```powershell
python scripts/motion_gallery.py export --styles styleOcean styleAurora
python scripts/album_background.py verify
python -m unittest discover -s tests -p 'test_*.py'
npm test
npm run sim:build
node scripts/test-motion-gallery-browser.mjs http://localhost:5173
```

Use the actual local Vite port. `capture` records a fresh pre-replacement decoded-video baseline; the delivered original baseline is already included and should be retained when reproducing this comparison. Source RGB is the native-JavaScript preview, not hardware or Rust/mquickjs acceptance.
