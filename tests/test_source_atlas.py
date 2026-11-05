import hashlib
import json
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path('assets/effects/source-atlas-motion')
def read(path):return json.loads(path.read_text(encoding='utf-8'))

class SourceAtlasTest(unittest.TestCase):
    def test_selected_leds_are_outside_a_fixed_guard_lip(self):
        import sys
        sys.path.insert(0,str(Path('scripts').resolve()))
        from source_atlas_assets import shared_field
        from outer_rim import OuterRim
        f=shared_field();r=OuterRim(f);j=read(ROOT/'index.json')
        profile=np.asarray(Image.open(ROOT/j['shared']['profile']))
        masks=np.asarray(Image.open(ROOT/j['shared']['masks']))
        old=np.asarray(Image.open(ROOT/'shared/profile.png'))
        for x,y,index in f.emitter_centers:
            moved=x-6 if x<384 else x+6
            np.testing.assert_array_equal(profile[y,moved],old[y,x])
        protected=r.lip>.999
        self.assertGreater(protected.sum(),500)
        self.assertEqual(int(masks[...,1][protected].max()),0)
        self.assertEqual(int(masks[...,0][protected].min()),255)
        import cv2
        components=cv2.connectedComponents((masks[...,0]>127).astype(np.uint8))[1]
        body_component=components[256,384]
        self.assertGreater(int(body_component),0)
        self.assertTrue(np.all(components[protected]==body_component),
                        'A stable rail can still float: every guard pixel must connect to the drone')
        neutral=np.asarray(Image.open(ROOT/j['shared']['base']))
        self.assertGreater(float(neutral[protected].mean()),35)
        np.testing.assert_array_equal(neutral[...,0],neutral[...,1])

    def test_source_textures_are_exact_rgb(self):
        for d in read(ROOT/'mapping.json')['effects']:
            expected=np.asarray(read(ROOT/d['trace'])['frames'],np.uint8)
            np.testing.assert_array_equal(np.asarray(Image.open(ROOT/'sources'/f"{d['id']}.png")),expected)

    def test_fixed_neutral_body_and_original_emitter_profile(self):
        import sys
        sys.path.insert(0,str(Path('scripts').resolve()))
        from source_atlas_assets import shared_field
        f=shared_field()
        profile=np.asarray(Image.open(ROOT/'shared/profile.png'))
        masks=np.asarray(Image.open(ROOT/'shared/masks.png'))
        neutral=np.asarray(Image.open(ROOT/'shared/drone.png'))
        np.testing.assert_array_equal(profile[...,2],f.base.max(axis=2))
        np.testing.assert_array_equal(profile[...,3],f.base.min(axis=2))
        np.testing.assert_array_equal(masks[...,1],np.round(f.band_mask*255).astype(np.uint8))
        self.assertGreater(len(f.emitter_centers),70)
        np.testing.assert_array_equal(neutral[...,0],neutral[...,1])
        np.testing.assert_array_equal(neutral[...,1],neutral[...,2])

    def test_generated_sheets_have_distinct_exterior_phases_and_provenance(self):
        plan=read(ROOT/'generation.json')
        self.assertEqual(len(plan['requests']),22)
        for r in plan['requests']:
            for p,sha in zip(r['images'],r['inputSha256']):
                self.assertEqual(hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),sha)
            self.assertEqual(hashlib.sha256((ROOT/r['output']).read_bytes()).hexdigest(),r['outputSha256'])
            atlas=np.asarray(Image.open(ROOT/'backgrounds'/f"{r['id']}.png"))
            self.assertEqual(atlas.shape,(1024,1536,3))
            panels=[atlas[y:y+512,x:x+768] for y,x in [(0,0),(0,768),(512,0),(512,768)]]
            # A numerical guard against identical background copies; visual action
            # direction still requires reviewing the generated sheets.
            self.assertTrue(all(np.abs(p.astype(float)-panels[0]).mean()>1 for p in panels[1:]),r['id'])

if __name__=='__main__':unittest.main()
