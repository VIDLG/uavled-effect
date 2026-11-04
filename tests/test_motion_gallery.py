import sys
import json
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from motion_gallery import loop_colors, detail_segment, AlbumField, album_paths


class LoopTests(unittest.TestCase):
    def test_aurora_paths_follow_observed_emitters_on_each_side(self):
        root = Path(__file__).resolve().parents[1]
        evidence = json.loads((root/'assets/effects/generated-motion-gallery/calibration-v4/observed-emitters.json').read_text())
        errors = []
        for point in evidence['points']:
            p = np.array(point)
            distances = []
            for path in album_paths('styleAurora'):
                for a,b in zip(path[:-1],path[1:]):
                    delta = b-a
                    t = np.clip(np.dot(p-a,delta)/np.dot(delta,delta),0,1)
                    distances.append(np.linalg.norm(p-a-t*delta))
            errors.append(min(distances))
        self.assertLess(float(np.mean(errors)), 1)
        self.assertLess(float(np.max(errors)), 2)
        left,right = album_paths('styleAurora')
        self.assertGreater(float(np.max(np.abs(left[:,0]+right[:,0]-768))), 5)

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
            if hasattr(field,'emitter_centers'):
                # White cores retain the source artwork's neutral highlights. Hue
                # lives in their chromatic component, checked below clipping.
                for index in (0,64,128,224):
                    colors=field.frames[index]*.15
                    frame=field.render(index/30,colors=colors)
                    points=np.array(field.emitter_centers)
                    actual=frame[points[:,1],points[:,0]].astype(np.float32)
                    expected=colors[points[:,2]]
                    a=actual-actual.min(axis=1,keepdims=True)
                    b=expected-expected.min(axis=1,keepdims=True)
                    active=(a.max(axis=1)>8)&(b.max(axis=1)>1)
                    self.assertTrue(active.any(),definition['id'])
                    a/=np.maximum(a.max(axis=1,keepdims=True),1)
                    b/=np.maximum(b.max(axis=1,keepdims=True),1)
                    self.assertLess(float(np.abs(a-b)[active].mean()),.04,definition['id'])
                continue
            for index in (0, 64, 128, 224):
                frame = field.render(index/30)
                np.testing.assert_array_equal(frame[field.mask == 0], field.base[field.mask == 0])
                expected = field.frames[index]
                for path in (field.left, field.right):
                    points = np.round(path).astype(int)
                    actual = frame[points[:, 1], points[:, 0]].astype(np.float32)
                    active = actual.max(axis=1) > 10
                    if not expected.any():
                        np.testing.assert_array_equal(actual,0,'Source-off LEDs must really turn off')
                        continue
                    self.assertTrue(active.any(),definition['id'])
                    a = actual/np.maximum(actual.max(axis=1, keepdims=True), 1)
                    b = expected/np.maximum(expected.max(axis=1, keepdims=True), 1)
                    self.assertLess(float(np.abs(a-b)[active].mean()), .02, definition['id'])

    def test_heartbeat_has_two_uniform_pulses_and_a_real_off_interval(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root/'assets/effects/generated-motion-gallery/source-frames.json').read_text(encoding='utf-8'))
        frames = np.array(data['styles']['styleHeartbeat'])
        for index in (7,27):
            self.assertGreater(frames[index].max(),200)
            np.testing.assert_array_equal(frames[index],np.tile(frames[index,0],(40,1)))
        np.testing.assert_array_equal(frames[60],0)
        np.testing.assert_array_equal(loop_colors(frames,180/30,180,0),frames[0])


if __name__ == "__main__":
    unittest.main()
