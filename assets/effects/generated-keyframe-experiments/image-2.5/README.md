# Image 2.5 keyframe experiment

Candidates generated through the configured `OpenAI()` endpoint using the exact requested model IDs `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst`. These names are supplied by that endpoint's model catalog. Production detail images are unchanged.

Each request edits two references: the existing style detail image fixes the series identity; a four-panel control sheet contains actual source simulation frames 0, 8, 16 and 24 at 30 FPS, including the 40 logical RGB swatches and mirrored hardware topology. Exact prompts, control sheets and source RGB are included. The generator returns one 2x2 contact sheet; panels are cropped without alignment or retouching.

| Files | Purpose |
| --- | --- |
| `*-grid.png` | Original model contact sheet, read left to right, top to bottom |
| `*-000.png`, `*-008.png`, `*-016.png`, `*-024.png` | Individual generated keyframes |
| `*-control-sheet.png` | Source-based reference supplied to the model |
| `*-comparison.gif`, `*-comparison.mp4` | Flare on the left, Sunburst on the right |
| `*-prompt.txt`, `source-frames.json`, `manifest.json` | Reproduction inputs, mapping rules and observations |

The previews hold each keyframe for 8/30 seconds. The MP4 stores 30 frames per second by repeating frames; it does not contain 30 distinct generated motion frames per second. This is an image-keyframe experiment, not a native video-model result. The four-frame cycle repeats with a visible end-to-start transition.

The source makes Cyberpunk magenta/cyan groups change along the strip, with brief localized glitches. Matrix independently activates green points and fades them; its background digital rain is a thematic interpretation, not evidence of traveling LEDs. The prompt keeps those two behaviors separate.

Observed: both variants retain the dense drone guards; light-state changes are visible; background displacement is still subtle. Central-body RGB varies slightly across panels, so the drone is not pixel-frozen. Do not infer exact source RGB reproduction or smooth video quality from these candidates.
