# Effect theme artwork

## Product intent

Provide theme-only artwork for the effect catalogue. The artwork should communicate the effect's visual mechanism first; a story or setting supports that mechanism and does not require a person, drone, or hardware.

## UX contract

- The image must be understandable from the effect name and its movement rule.
- `Bounce` shows a point reversing between boundaries, `Stack` shows layers accumulating, and `Strobe` shows aligned bright/dark exposure slices.
- Artwork is a square editorial cover and remains separate from the UAV/drone detail artwork.

## Shared domain/data contract

Each generated request records the effect id, Chinese label, source image path and hash, palette, visual mechanism, prompt path/hash, output path/hash, model, dimensions, and generation quality in `output/imagegen/theme-story-samples-v6/generation.json`.

## Flutter mobile route

Current work is asset preparation only. Mobile should consume the selected artwork through the existing effect catalogue asset mapping when this batch is promoted; no mobile route or runtime contract changed in this turn.

## Tauri desktop route

Desktop should use the same effect id to artwork mapping and mechanism metadata. The first parity slice is to load the same square asset and metadata used by mobile without regenerating artwork per platform.

## Sync and storage implications

Generated previews are kept under `output/imagegen/` and are not runtime assets until explicitly selected. Runtime promotion should preserve stable effect ids and avoid loading all variants at once.

## AI/provider implications

The batch used the configured OpenAI image generation route with `gpt-image-2.5-flare`. Prompts are saved before generation; model, hashes, dimensions, and missing ids are recorded for repeatability. Prompts use mechanism-first rules and explicitly exclude drone, LED hardware, typography, and generic plot substitutions.

## Implementation log

- 2026-11-06: Generated 51 mechanism-first theme-only previews in `output/imagegen/theme-story-samples-v5/`.
- 2026-11-06: Added direct mappings for Bounce, Bounce Tail, Stack, Strobe, Scanner, Color Wipe, Dual Wave, and the remaining catalogue effects.
- 2026-11-06: Created `theme-mechanism-contact-sheet.jpg` for visual review.
- 2026-11-06: Regenerated all 51 previews as `output/imagegen/theme-story-samples-v6/` after accidental model lettering was rejected; removed story-title text from prompts and strengthened the no-text constraint.

## Mobile lessons learned

Keep effect behavior in the prompt mapping rather than relying on a theme name alone. A person or cinematic setting can obscure the action and should remain optional.

## Desktop follow-up notes

Reuse the same metadata and square asset contract. Desktop can later provide a larger preview, but should not introduce a different visual vocabulary for the same effect id.

## Route changes

No app routes changed. This turn adds preview artifacts and metadata only.

## Known pitfalls

- Image models may still introduce accidental lettering even when typography is prohibited; inspect candidates before promoting them to runtime assets.
- The v6 batch removes the observed lettering in the inspected Bounce and Strobe outputs, but every future batch still needs a visual no-text check.
- A mechanism can be visually correct while its environment is too low contrast; keep the moving form separated from the background.
- Earlier v4/v5 preview batches remain local experiments; v6 is the committed no-text preview batch.

## Verification

- Batch completed with 51 generated PNG files.
- `generation.json` reports `generatedCount=51`, `missingIds=[]`, and `(1254, 1254)` dimensions for every request.
- Contact sheet generated successfully and key mechanism images were visually inspected: Bounce, Stack, Strobe, Scanner, Color Wipe, and Dual Wave.
- v6 contact sheet generated successfully with 51/51 outputs; Bounce and Strobe were rechecked and contain no visible generated text.
