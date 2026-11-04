# Aurora physical-strip correction

The old path drifted outward at the S bend and lower endpoints and assumed exact mirror symmetry. Both strips are now independently traced against actual white emitter cores in the existing Aurora detail image.

`observed-emitters.json` records 22 independently selected emitter centers and old/new residuals: mean 6.314 → 0.592 px; maximum 18.117 → 1.940 px at 768x512. The regression requires mean below 1 px and maximum below 2 px. Before/after guide PNGs visualize placement.

`calibration.json` records the corrected paths. `render.json` records reused v3 generated inputs and hashes. No new image API calls are needed for this correction: generated images supply bounded brightness texture, while final RGB and masks use corrected physical coordinates. Historical v3 prompts, controls, raw outputs and videos are retained.

The catalog selects the parent's `styleAurora-calibrated-v4-loop.mp4`; revision tags refresh the poster and thumbnails. Reproduce with `python scripts/motion_gallery.py export --styles styleAurora`. The approved v3 background and fixed neutral drone material are retained.
