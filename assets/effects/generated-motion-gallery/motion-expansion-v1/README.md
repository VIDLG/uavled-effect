# Four additional motion albums

Lava, Galaxy and Neon each use eight source-state anchors generated with the selected **gpt-image-2.5-flare** model through the official imagegen CLI and configured OpenAI environment. Heartbeat reuses one existing generated artwork because all LEDs change together. No effect/helper source is modified.

| Album | Actual source and mapping | Loop |
| --- | --- | --- |
| Lava | `sin255(_frame*2+i*45)` advances orange/red heat crests toward lower logical indices; always lit, with slower outer heat fronts. | 256 source frames, 8.533s |
| Galaxy | Two blue/purple waves plus localized near-white flashes. Source RGB governs final light colors and positions. | 256 frames, 8.533s; final 12 blend to start |
| Neon | Native JavaScript ledHsv collapses most hues to identical magenta; exact-sector frames 14,29,44,... briefly change discrete color blocks. Anchors include these times. This shows actual intermittent changes, rather than the continuous hue chase described in the source comment. | 180 frames, 6s |
| Heartbeat | `styleHeartbeat(255,0,40)` has two triangular pulses and an off interval every 90 frames. Both complete strips change together; only chromatic background light motifs pulse. | 180 frames, 6s |

## Assets and reproduction

- `rules.json`: mapping saved before generation. The parent's `source-frames.json` adds four actual JavaScript traces, source calls and hashes; unchanged historical traces are retained.
- `calibration.json`, `controls/*-calibration.jpg`: independently calibrated left/right physical paths for each artwork, reviewed before generation.
- `references/`: existing series artworks resized to 768x512; formal static detail images remain unchanged.
- `controls/`, `prompts/`, `raw/`: exact source-state sheets, exact edit prompts and six delivered API outputs.
- `generation.json`: actual input/output paths and hashes. Heartbeat explicitly has zero new AI keyframes.
- `neon-initial-trial/`: rejected initial anchors missed the exact-sector times. Original controls, prompts and two API outputs remain with their diagnosis, excluded from delivered anchors.
- Parent posters, seek thumbnails, videos, space-time plots and verification records are runtime outputs. The gallery now contains nine video albums plus the existing live single-image Rainbow.

Run `npm run build`, `node scripts/prepare-motion-gallery.mjs`, then `python scripts/album_extensions.py prepare`. Edit each Lava/Galaxy/Neon control sheet using the matching reference as image 2 and exact prompt, model gpt-image-2.5-flare, size 1536x1024, quality high and no prompt augmentation; save matching raw outputs. Heartbeat needs no API call. Export with `python scripts/motion_gallery.py export --styles styleLava styleGalaxy styleNeon styleHeartbeat`.

The renderer uses source RGB on fixed paths and bounded generated brightness texture transported forward. It does not play whole-image AI frames or assert exact AI trajectory fidelity. Neutral pixels stay unchanged before compression. Background geometry remains fixed; luminous texture supplies thematic movement. Native JavaScript and desktop playback evidence do not establish Rust/mquickjs, hardware or phone acceptance.
