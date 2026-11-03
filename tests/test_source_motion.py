"""Regressions for direction, transition colors, and neutral-region protection."""
import sys
import json
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from source_motion import sample_source, phase_coordinate, replace_regions, MotionField


class SourceMotionTests(unittest.TestCase):
    def test_playback_never_reverses_after_last_keyframe(self):
        frames = np.array([[[0, 0, 0]], [[40, 80, 120]], [[80, 160, 240]]], dtype=np.float32)
        values = [sample_source(frames, t, 1)[0, 0] for t in (0, .5, 1, 1.5, 2, 2.5, 3)]
        self.assertEqual(values, [0, 20, 40, 60, 80, 80, 80])

    def test_cyberpunk_corresponding_phase_moves_to_lower_indices(self):
        # Directly derived from phase = (_frame * 4 + i * 42) % 512.
        for source_frame in (0, 16, 32, 48, 64):
            start = 25.0
            end = start - 16 * 4 / 42
            self.assertAlmostEqual(phase_coordinate(start, source_frame), phase_coordinate(end, source_frame + 16))
            self.assertLess(end, start)

    def test_color_transition_is_replacement_and_keeps_unmasked_pixels_exact(self):
        base = np.array([[[255, 0, 0], [110, 112, 114]]], dtype=np.uint8)
        target = np.array([[[0, 180, 240], [0, 0, 0]]], dtype=np.float32)
        result = replace_regions(base, target, np.array([[1, 0]], dtype=np.float32))
        np.testing.assert_array_equal(result[0, 0], [0, 180, 240])
        np.testing.assert_array_equal(result[0, 1], base[0, 1])

    def test_rendered_positions_follow_source_colors_on_both_mirrored_paths(self):
        root = Path(__file__).resolve().parents[1]
        source = json.loads((root/'assets/effects/generated-keyframe-experiments/source-motion-v1/source-frames.json').read_text())
        for style in ('styleCyberpunk', 'styleMatrix'):
            field = MotionField(style, source['styles'][style])
            for source_index in (0, 16, 32, 48, 64, 80, 96, 112):
                frame = field.render(source_index/30)
                np.testing.assert_array_equal(frame[field.mask == 0], field.base[field.mask == 0])
                expected = field.frames[source_index]
                active = expected.max(axis=1) > 10
                for path in (field.left, field.right):
                    points = np.round(path).astype(int)
                    actual = frame[points[:, 1], points[:, 0]].astype(np.float32)
                    if active.any():
                        a = actual/np.maximum(actual.max(axis=1, keepdims=True), 1)
                        b = expected/np.maximum(expected.max(axis=1, keepdims=True), 1)
                        self.assertLess(float(np.abs(a-b)[active].mean()), .015)
                    off = expected.max(axis=1) == 0
                    np.testing.assert_array_equal(actual[off], 0)


if __name__ == "__main__":
    unittest.main()
