"""Join the physical guard before attaching the unchanged dense LED profile.

V6 takes a bounded neutral perimeter repair from the recorded image edit.
The repair extends beyond emitter endpoints to the original molded joins;
stopping a patch at the last emitter creates a disconnected rail.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from source_motion import smoothstep, replace_regions

REPAIRS = Path('assets/effects/source-atlas-motion/rim-v6')


class OuterRim:
    def __init__(self, field):
        self.field = field
        y, x = field.y, field.x
        direction = np.where(x < 384, -1., 1.).astype(np.float32)
        self.map_x = (x-direction*6).astype(np.float32)
        self.map_y = y.astype(np.float32)
        original = getattr(field, 'material_matte', None)
        if original is None:
            from album_detail_v2 import configure_foreground
            configure_foreground(field)
            original = field.material_matte

        folder = REPAIRS if field.style == 'styleNeon' else REPAIRS/field.style
        repaired = np.asarray(Image.open(folder/'repaired.png').convert('RGB')
                              .resize((768, 512), Image.Resampling.LANCZOS), np.float32)
        self.repaired_gray = repaired @ np.array([.2126, .7152, .0722])
        # Fill external silhouette: dark rotors inside remain opaque.
        contours = cv2.findContours((self.repaired_gray > 45).astype(np.uint8),
                                   cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        matte = np.zeros((512, 768), np.float32)
        cv2.drawContours(matte, [max(contours, key=cv2.contourArea)], -1, 1, -1)
        matte = cv2.GaussianBlur(matte, (0, 0), .5)

        distance = field.distance.copy()
        self.joins = []
        for path in (field.left, field.right):
            inward = 1 if path[0, 0] < 384 else -1
            # Repair bounds continue through the diagonal frame and lower
            # corner. These bounds do not draw the visible guard contour.
            ends = [(path[0], path[0]+[inward*77, -71]),
                    (path[-1], path[-1]+[inward*70, 11])]
            self.joins.extend(ends)
            for a, b in ends:
                delta = b-a
                t = np.clip(((x-a[0])*delta[0]+(y-a[1])*delta[1]) /
                            np.dot(delta, delta), 0, 1)
                distance = np.minimum(distance, np.hypot(x-a[0]-t*delta[0], y-a[1]-t*delta[1]))
        self.repair_weight = 1-smoothstep(20, 32, distance)
        gray = field.base @ np.array([.2126, .7152, .0722])
        self.body = np.repeat(np.round(gray*(1-self.repair_weight)+
                              self.repaired_gray*self.repair_weight)[..., None], 3, axis=2).clip(0, 255).astype(np.uint8)
        self.body_mask = original*(1-self.repair_weight)+matte*self.repair_weight
        self.structure = self.repair_weight*self.body_mask
        self.band = self.shift(field.band_mask)*(1-self.body_mask)
        # Fixed physical material beside the carrier, including its joins.
        self.lip = ((1-smoothstep(4, 7, field.distance))*
                    (self.repaired_gray > 45)*self.body_mask)
        # Erase superseded fragments in historical frames so the original
        # silhouette cannot survive as a second rail beside the new guard.
        self.erase = ((original+field.band_mask-self.body_mask-self.band).clip(0, 1)*
                      self.repair_weight)

    def shift(self, image, nearest=False):
        return cv2.remap(image, self.map_x, self.map_y,
                         cv2.INTER_NEAREST if nearest else cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_REFLECT_101)

    def restore(self, frame):
        clean = cv2.inpaint(frame, (self.erase > .15).astype(np.uint8)*255, 3, cv2.INPAINT_TELEA)
        clean = replace_regions(frame, clean, self.erase)
        return replace_regions(clean, self.body, self.structure)

    def frame(self, frame):
        return replace_regions(self.restore(frame), self.shift(frame), self.band)
