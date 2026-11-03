# Ocean / Aurora: richer scene depth

V2's ocean and polar-night feel was approved, but its background was too plain. V3 keeps that identity and LED readability while enriching the surrounding scene. It is a revision of the motion albums, not a replacement of the formal static detail set.

## Source-to-image mapping, written before generation

`rules.json` and `background-prompts/` precede the API calls. The model remains the selected **gpt-image-2.5-flare**, used through the official imagegen CLI with configured `OpenAI()` credentials; no credentials are stored.

| Source / visual role | Mapping |
| --- | --- |
| Ocean's two blue/cyan waves | Source RGB and calibrated LED paths remain authoritative. The outer water gains overlapping cobalt/teal wave ridges, fine ripples, foam and restrained silver/cyan glints. |
| Aurora's curtain/shimmer waves | Actual native-JavaScript magenta LED output remains authoritative. The outer sky gains overlapping turquoise/blue-violet curtains, fine vertical rays and sparse star clusters. The existing `ledHsv` discrepancy remains documented in the parent README; no source helper is changed. |
| Strip surroundings | Maximum background RGB stays at 28/255 within 24 image pixels of a calibrated strip; it rises smoothly to 180/255 at 80 pixels. The brighter outer scene is not a copy of local LED color sections. |
| Background time | One broad, low-amplitude 8.533-second light front independent of local LED phases, plus bounded transported generated microtexture. The underlying scene geometry stays fixed. This is thematic motion, not full fluid or aurora simulation. |
| Drone and physical carriers | Register generated edits to original neutral features, restore original neutral drone material and physical emitter texture, then render source RGB. No generated whole-image warping is played back. |

## Assets and provenance

- `references/`: upscaled approved v2 composition, used as the background-edit target.
- `background-prompts/`, `background-raw/`: two exact edit prompts and actual API results.
- `bases/`, `masks/`, `alignment.json`: edited scenes with original neutral materials/carriers restored, feathered scene masks and registration evidence.
- `controls/`, `prompts/`, `raw/`: four source-position 2×2 storyboards, exact keyframe prompts and four API outputs, giving eight anchors per style at source frames 0, 32, …, 224.
- `generation.json`: six API requests with input/output paths and SHA256 values. The parent generation manifest links this revision and retains its original requests.
- `before/`, `comparison.jpg`: v2 versus v3 posters. The old revision directory and videos remain intact.
- `contrast-baseline.json`, `contrast-verification.json`: eight decoded video samples per style. The local strip/context ratio must remain above 2 and retain at least 80% of v2's average ratio. Outer-scene mean luma and chroma must increase by at least 25%. These are numeric design checks, not perceptual-study acceptance.
- `before-hashes.json`: evidence that the other three selected video files remain unchanged.

The runtime catalog, current posters, seek thumbnails and `*-background-v3-loop.mp4` clips live in the parent directory. Catalog revision tags refresh browser media URLs. Each clip has 512 unique rendered frames at 60 FPS, lasting 8.533 seconds. Pre-compression neutral differences and loop-join evidence remain in the parent's `verification.json`.

Delivered decoded-video measurements:

| Style | Mean strip/context ratio, v2 → v3 | Minimum v3 ratio | Outer mean luma, relative to v2 | Outer mean chroma, relative to v2 |
| --- | --- | --- | --- | --- |
| Ocean | 3.650 → 3.431 | 3.321 | 2.163× | 1.883× |
| Aurora | 2.828 → 3.574 | 3.320 | 2.159× | 3.013× |

All 10 Python and 16 Node tests and the production build passed. The real Edge browser check confirmed the selected v3 URLs, forward playback, loop wrap, pause/seek, switching, mobile overflow and reduced-motion manual playback, with no captured console or asset errors. The short desktop playback samples observed approximately 52 frame callbacks per second for both v3 videos; encoding at 60 FPS is not a measured phone-frame-rate guarantee. Local screenshots/report are under ignored `tmp/motion-gallery/`.

## Reproduce

From the repository root:

```powershell
python scripts/album_background.py prepare
python scripts/album_background.py capture
```

`capture` reads the retained v2 videos, using the same original calibration/region mask for both versions. For each style, run the official CLI `edit` operation with `references/<style>.png`, the exact `background-prompts/<style>.txt`, model `gpt-image-2.5-flare`, size `1536x1024`, quality `high` and `--no-augment`; save to `background-raw/<style>.png`. Then:

```powershell
python scripts/album_background.py compose
python scripts/album_background.py controls
```

For each style and batches `00`/`01`, edit with the control sheet as image 1, `bases/<style>.png` as image 2 and the corresponding exact prompt. Use the same model/settings and save to `raw/<style>-<batch>.png`.

```powershell
python scripts/motion_gallery.py export --styles styleOcean styleAurora
python scripts/album_background.py verify
python -m unittest discover -s tests -p 'test_*.py'
npm test
npm run sim:build
node scripts/test-motion-gallery-browser.mjs http://localhost:5173
```

Use the actual Vite port. Native-JavaScript source preview and desktop-browser checks do not establish Rust/mquickjs, hardware, or phone playback acceptance.
