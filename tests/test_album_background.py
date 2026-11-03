"""Regressions for foreground/background separation without changing source LEDs."""
import json
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from motion_gallery import AlbumField, ROOT
from album_background import backdrop


def local_contrast(field, frame):
    led, context = [], []
    for points, offset in ((field.left, -25), (field.right, 25)):
        p = np.round(points).astype(int)
        led.extend(frame[p[:, 1], p[:, 0]])
        context.extend(frame[p[:, 1], p[:, 0]+offset])
    weights = np.array([.2126, .7152, .0722])
    return float(np.mean(np.asarray(led)@weights)/(np.mean(np.asarray(context)@weights)+1))


class BackgroundTests(unittest.TestCase):
    def test_texture_cannot_brighten_the_quiet_background_beside_leds(self):
        distance = np.array([[16., 100.]])
        color = backdrop(np.full((1, 2, 3), 255.), distance, np.zeros((1, 2)), 0, np.full((1, 2), 1.35))
        self.assertLessEqual(float(color[0, 0].max()), 28.01)
        self.assertLessEqual(float(color[0, 1].max()), 110.01)
        np.testing.assert_allclose(color, backdrop(np.full((1, 2, 3), 255.), distance, np.zeros((1, 2)), 256/30, np.full((1, 2), 1.35)))

    def test_ocean_aurora_background_separate_without_changing_led_signal(self):
        data = json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
        for definition in data['definitions']:
            if definition['id'] not in ('styleOcean', 'styleAurora'):
                continue
            field = AlbumField(definition, data['styles'][definition['id']])
            self.assertTrue(field.revised, 'Revised background must be active in the actual gallery exporter')
            previous = AlbumField(definition, data['styles'][definition['id']], revised=False)
            for index in (0, 64, 128, 224):
                current, old = field.render(index/30), previous.render(index/30)
                for points in (field.left, field.right):
                    p = np.round(points).astype(int)
                    np.testing.assert_array_equal(current[p[:, 1], p[:, 0]], old[p[:, 1], p[:, 0]])
                self.assertGreater(local_contrast(field, current), 2)
                self.assertGreater(local_contrast(field, current), local_contrast(previous, old)*1.8)
                np.testing.assert_array_equal(current[field.mask == 0], field.base[field.mask == 0])
            # At a fixed time the background must not repeat every local LED color section.
            a = field.render(0, colors=np.full((40, 3), [20, 160, 240.]))
            b = field.render(0, colors=np.full((40, 3), [240, 30, 150.]))
            background = (field.background_mask > .99) & (field.distance > 18)
            np.testing.assert_array_equal(a[background], b[background])


if __name__ == '__main__':
    unittest.main()
