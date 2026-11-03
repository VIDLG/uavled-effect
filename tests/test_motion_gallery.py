import sys
import json
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from motion_gallery import loop_colors, detail_segment, AlbumField


class LoopTests(unittest.TestCase):
    def test_closure_rejoins_start_without_reversing_middle(self):
        frames = np.arange(257, dtype=np.float32)[:, None, None]*np.ones((1, 2, 3))
        np.testing.assert_array_equal(loop_colors(frames, 200/30), frames[200])
        np.testing.assert_array_equal(loop_colors(frames, 256/30), frames[0])
        self.assertLess(float(loop_colors(frames, 255.99/30).max()), .001)
        np.testing.assert_array_equal(loop_colors(frames, (256+16)/30), frames[16])

    def test_generated_detail_wraps_forward_into_first_anchor(self):
        keys = list(range(0, 256, 32))
        self.assertEqual(detail_segment(keys, 240), (7, 0, .5, 224, 256))
        self.assertEqual(detail_segment(keys, 272), (0, 1, .5, 0, 32))

    def test_new_album_led_hues_follow_actual_source_on_both_sides(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root/'assets/effects/generated-motion-gallery/source-frames.json').read_text(encoding='utf-8'))
        for definition in data['definitions']:
            if definition.get('existing'):
                continue
            field = AlbumField(definition, data['styles'][definition['id']])
            for index in (0, 64, 128, 224):
                frame = field.render(index/30)
                np.testing.assert_array_equal(frame[field.mask == 0], field.base[field.mask == 0])
                expected = field.frames[index]
                for path in (field.left, field.right):
                    points = np.round(path).astype(int)
                    actual = frame[points[:, 1], points[:, 0]].astype(np.float32)
                    active = actual.max(axis=1) > 10
                    self.assertTrue(active.any())
                    a = actual/np.maximum(actual.max(axis=1, keepdims=True), 1)
                    b = expected/np.maximum(expected.max(axis=1, keepdims=True), 1)
                    self.assertLess(float(np.abs(a-b)[active].mean()), .02, definition['id'])


if __name__ == "__main__":
    unittest.main()
