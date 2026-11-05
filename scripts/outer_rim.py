"""Separate a non-emissive guard lip from its externally attached LED strip.

Retain bead scale/texture and source coordinates; translate the entire carrier
six image pixels outwards. Reconstruct only the narrow formerly covered lip
from adjacent neutral material, never a bounding polygon.
"""
import cv2
import numpy as np
from source_motion import smoothstep, replace_regions


class OuterRim:
    def __init__(self, field):
        self.field=field
        y,x=field.y,field.x
        direction=np.where(x<384,-1.,1.).astype(np.float32)
        self.map_x=(x-direction*6).astype(np.float32)
        self.map_y=y.astype(np.float32)
        # Closest traced path x at each row; signed distance is positive inwards.
        edge=np.zeros_like(x)
        for path,left in [(field.left,True),(field.right,False)]:
            points=np.asarray(path)
            row=np.interp(np.arange(512),points[:,1],points[:,0])
            region=x<384 if left else x>=384
            edge[region]=np.broadcast_to(row[:,None],x.shape)[region]
        self.inward=(x-edge)*-direction
        self.lip=(1-smoothstep(3,5,field.distance))*smoothstep(-3,-1,self.inward)
        rgb=field.base.astype(np.float32)
        gray=rgb@np.array([.2126,.7152,.0722])
        # Nearby inboard material gives the guard's own exposure and shading.
        sample_x=(x-direction*9).astype(np.float32)
        material=cv2.remap(gray.astype(np.float32),sample_x,y,cv2.INTER_LINEAR)
        material=cv2.GaussianBlur(material,(0,0),.7).clip(35,180)
        self.material=np.repeat(material[...,None],3,axis=2)
        self.body=replace_regions(np.repeat(gray[...,None],3,axis=2),self.material,self.lip)
        self.band=self.shift(field.band_mask)* (1-smoothstep(-4,-2,self.inward))
        self.body_mask=np.maximum(getattr(field,'material_matte',np.zeros_like(x)),self.lip)
        self.band*=1-self.lip

    def shift(self,image,nearest=False):
        return cv2.remap(image,self.map_x,self.map_y,cv2.INTER_NEAREST if nearest else cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)

    def frame(self,frame):
        restored=replace_regions(frame,self.material,self.lip)
        # Halo stays feathered; the fixed lip is never multiplied by light level.
        return replace_regions(restored,self.shift(frame),self.band)
