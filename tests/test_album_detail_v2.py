import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from motion_gallery import AlbumField,ROOT,merged_requests
from album_detail_v2 import STYLES,scene_at,transport

class DetailTests(unittest.TestCase):
    def test_emitter_gaps_and_protected_body(self):
        data=json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
        for d in data['definitions']:
            if d['id'] not in STYLES:continue
            f=AlbumField(d,data['styles'][d['id']])
            values=f.band_texture[f.distance<3]
            self.assertGreater(np.percentile(values,80)/np.percentile(values,20),8)
            self.assertEqual(float(f.background_mask[f.protected_hull>0].max()),0)
            fixed=(f.protected_hull>0)&(f.band_mask==0)
            np.testing.assert_array_equal(f.render(1)[fixed],f.base[fixed])

    def test_full_rgb_anchor_motion_survives_composition(self):
        data=json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
        d=next(d for d in data['definitions'] if d['id']=='styleLava')
        f=AlbumField(d,data['styles'][d['id']])
        a=np.zeros((512,768,3),np.float32);a[:,:100,0]=100
        b=np.zeros_like(a);b[:,50:150,2]=100
        f.rgb_backgrounds=[a,b]+[a]*6
        zero=scene_at(f,0);next_frame=scene_at(f,d['keyframes'][1]/30)
        self.assertGreater(float(zero[:,:100,0].mean()),90)
        self.assertGreater(float(next_frame[:,50:150,2].mean()),90)
        self.assertEqual(float(next_frame[...,0].max()),0)

    def test_luminous_front_advances_in_space(self):
        data=json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
        d=next(d for d in data['definitions'] if d['id']=='styleLava')
        f=AlbumField(d,data['styles'][d['id']])
        image=np.zeros((512,768,3),np.float32);image[20:40,100:120]=100
        moved=transport(f,image,.5)[...,0]
        y,x=np.indices(moved.shape)
        self.assertAlmostEqual(float((x*moved).sum()/moved.sum()),109.5-6,delta=.2)
        self.assertAlmostEqual(float((y*moved).sum()/moved.sum()),29.5+7.5,delta=.2)

    def test_partial_export_preserves_other_generation_records(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'generation.json'
            path.write_text(json.dumps({'requests':[{'output':'a','hash':'old'},{'output':'b','hash':'kept'}]}),encoding='utf-8')
            self.assertEqual(merged_requests(path,[{'output':'a','hash':'new'}]),[
                {'output':'a','hash':'new'},{'output':'b','hash':'kept'}])

if __name__=='__main__':unittest.main()
