# Lava / Galaxy / Neon: background movement and emitter detail

The previous renderer retained a fixed scene and used generated anchors only as a blurred scalar brightness ratio. Its prompts also locked background geometry. Generated phases therefore looked nearly identical. Saturated halos had a high brightness floor, filling inter-emitter gaps with color.

This revision changes only Lava, Galaxy and Neon. Heartbeat and the other album videos remain intact.

- Eight regenerated full-color background phases per style show displaced and deformed luminous structures. Exact source-to-scene rules and edit prompts were saved before generation in `rules.json` and `prompts/`. Controls establish different background displacements. The model remains user-selected **gpt-image-2.5-flare**, using the official imagegen CLI / configured OpenAI environment.
- Lava hot ridges descend diagonally, Galaxy filaments drift left/up with changing star clusters, and Neon scanning lines travel left. These are thematic background mappings; Neon LEDs still follow actual intermittent native-JavaScript color blocks.
- Registered RGB anchors are kept in full color, transported forward between anchors and crossfaded into the next phase. The background no longer reduces to a brightness multiplier. Generated drone pixels are inpainted before transport, so they cannot become displaced duplicate guards. The original drone is composited with a protected interior and feathered outer boundary.
- Physical emitters use fixed original high-frequency core texture, dark gaps and a narrow weak halo. Generated strip texture and Gaussian detail blur do not enter the foreground. Actual source RGB still determines color/brightness; neutral material remains fixed before compression.
- Generated backgrounds permit bounded registration scale correction up to 15% and translation up to 60 px, with at least 12 RANSAC inliers. This applies only to extracted backgrounds; original foreground geometry is never transformed. Earlier whole-image/detail registration limits remain unchanged.

`references/`, `controls/`, `prompts/`, `raw/` contain the six actual edit requests. `generation.json` records input/output hashes. `before/` holds old posters. New runtime files are the parent's `*-detail-v2-loop.mp4`, current posters and seek thumbnails; old videos and original generation records remain available.

Reproduce the selected videos directly from the saved inputs: run `python scripts/motion_gallery.py export --styles styleLava styleGalaxy styleNeon`. For a new generation experiment, `python scripts/album_detail_v2.py` prepares controls and prompts; archive this revision first, because preparation overwrites inputs. Saved controls are the exact API inputs used here; subsequent hull protection and background cleanup changes are in the renderer. Use each matching reference as image 2 and exact prompt, model gpt-image-2.5-flare, size 1536x1024, quality high, no augmentation.

`motion-comparison.json` records decoded-video optical-flow diagnostics: outer-background displacement per 0.5 seconds increased from 0.07/0.08/0.18 px to 9.90/8.96/8.31 px for Lava/Galaxy/Neon. These are motion diagnostics, not perceptual scores. `browser-verification.json` records production-preview playback, loop/seek controls, decoder isolation and emulated mobile layout. Videos are encoded at 60 FPS; headless browser callback rates in the report are measured separately and are lower.

Tests cover source RGB, protected drone material, strong emitter-core/gap contrast, complete RGB anchor changes and loop behavior. Browser evidence is desktop/emulated mobile playback, not physical-device acceptance. Background transport is an image-space visual approximation.
