"""Retain original-artwork emitter footprints and follow the actual silhouette."""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from source_motion import smoothstep, save_image

REVISION = Path('assets/effects/generated-motion-gallery/foreground-detail-v3')


def material_matte(field):
    hsv = cv2.cvtColor(field.base, cv2.COLOR_RGB2HSV).astype(np.float32)
    saturation, value = hsv[..., 1]/255, hsv[..., 2]
    inside = field.protected_hull > 0
    labels = np.full(inside.shape, cv2.GC_BGD, np.uint8)
    reach = cv2.dilate(inside.astype(np.uint8), np.ones((19, 19), np.uint8)) > 0
    labels[reach] = cv2.GC_PR_BGD
    labels[inside] = cv2.GC_PR_FGD
    labels[inside & (saturation > .55)] = cv2.GC_PR_BGD
    labels[inside & (saturation < .28) & (value > 60)] = cv2.GC_FGD
    labels[70:410, 310:458] = cv2.GC_FGD
    cv2.setRNGSeed(7)
    cv2.grabCut(cv2.cvtColor(field.base, cv2.COLOR_RGB2BGR), labels, None,
                np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
    material = np.isin(labels, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8)
    material[field.distance < 7] = 0
    # Keep the connected drone, not isolated stars or laser fragments. The rotor
    # interiors remain original artwork; no arbitrary isolated transparent holes.
    contours, _ = cv2.findContours(material, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    silhouette = np.zeros_like(material)
    cv2.drawContours(silhouette, [max(contours, key=cv2.contourArea)], -1, 255, cv2.FILLED)
    return cv2.GaussianBlur(silhouette.astype(np.float32)/255, (0, 0), .65)


def restore_emitters(field):
    matte_path = REVISION/'masks'/f'{field.style}.png'
    if matte_path.exists():
        matte = np.asarray(Image.open(matte_path).convert('L'), np.float32)/255
    else:
        matte = material_matte(field)
    field.material_matte = matte
    field.background_mask = 1-matte
    outside = cv2.distanceTransform((matte < .5).astype(np.uint8), cv2.DIST_L2, 5)
    field.motion_weight = smoothstep(3, 30, outside)

    rgb = field.base.astype(np.float32)
    field.emitter_white = rgb.min(axis=2)
    field.emitter_chroma = rgb.max(axis=2)-field.emitter_white
    hsv = cv2.cvtColor(field.base, cv2.COLOR_RGB2HSV).astype(np.float32)
    saturation = hsv[..., 1]/255
    # Restore the pre-v2 brightness footprint. No high-pass subtraction, shrinking,
    # thresholding or black floor is applied to the displayed bead texture.
    field.band_texture = np.clip(hsv[..., 2]/255*(1-.72*saturation)*1.2, .025, 1)
    colored = cv2.dilate(smoothstep(.08, .3, saturation), np.ones((3, 3), np.uint8))
    # The old renderer feathered into the still-present original halo. Once the
    # background is replaced, the complete halo support must be restored too.
    field.band_mask = np.maximum((1-smoothstep(10, 20, field.distance))*colored,
                                 1-smoothstep(6, 8, field.distance))

    # Locate existing bright cores only to choose color cells, never to alter their
    # size or shape. Voronoi boundaries run through gaps rather than across cores.
    peaks = field.emitter_white-cv2.GaussianBlur(field.emitter_white, (0, 0), 2)
    cores = ((peaks > 12) & (field.emitter_white > 100) & (field.distance < 7)).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(cores, 8)
    keep = np.zeros_like(cores)
    for index in range(1, count):
        if 1 <= stats[index, cv2.CC_STAT_AREA] <= 90:
            keep[labels == index] = 1
    if cv2.connectedComponents(keep)[0] < 20:
        raise ValueError(f'Insufficient original emitter landmarks for {field.style}')
    _, nearest = cv2.distanceTransformWithLabels(1-keep, cv2.DIST_L2, 5,
                                                labelType=cv2.DIST_LABEL_CCOMP)
    coordinate = np.zeros(int(nearest.max())+1, np.int32)
    field.emitter_centers = []
    for label in np.unique(nearest[keep > 0]):
        yy, xx = np.where((nearest == label) & (keep > 0))
        x, y = int(np.round(xx.mean())), int(np.round(yy.mean()))
        coordinate[label] = int(np.clip(np.round(field.coordinate[y, x]), 0, 39))
        field.emitter_centers.append((x, y, coordinate[label]))
    field.emitter_coordinate = coordinate[nearest]
    field.band_mask = np.maximum(field.band_mask, keep)
    field.mask = np.maximum(field.background_mask, field.band_mask)


def light_layer(field, colors):
    discrete = colors[field.emitter_coordinate]
    diffuse = field.at_coordinate(colors, field.coordinate)
    core_weight = smoothstep(85, 150, field.emitter_white)[..., None]
    source = discrete*core_weight+diffuse*(1-core_weight)
    level = source.max(axis=2, keepdims=True)
    hue = source/np.maximum(level, 1)
    # Preserve white cores and the original colored halo profile. A fixed display
    # response lifts dim source levels without moving or resampling the artwork.
    response = np.sqrt(level/max(float(field.frames.max()), 1))
    return np.minimum((field.emitter_white[..., None]+field.emitter_chroma[..., None]*hue)*response*1.25, 255)


def background(field, scene, seconds, period):
    # Local contrast rolls off gradually; there is no flat 24 px dark collar.
    near = smoothstep(3, 36, field.distance)[..., None]
    luma = scene@np.array([.2126, .7152, .0722])
    saturation = .82+.14*near
    rgb = scene*saturation+luma[..., None]*(1-saturation)
    phase = 2*np.pi*(field.x/768*1.3+field.y/512*.7)
    rgb *= (.93+.07*np.cos(phase-seconds*2*np.pi/period))[..., None]
    ceiling = 75+105*near
    return rgb*np.minimum(1, ceiling/np.maximum(rgb.max(axis=2, keepdims=True), 1))


def prepare():
    from motion_gallery import AlbumField, ROOT
    from album_detail_v2 import STYLES
    (REVISION/'masks').mkdir(parents=True, exist_ok=True)
    data = json.loads((ROOT/'source-frames.json').read_text(encoding='utf-8'))
    for definition in data['definitions']:
        if definition['id'] not in STYLES:
            continue
        field = AlbumField(definition, data['styles'][definition['id']])
        matte = material_matte(field)
        save_image(Image.fromarray(np.round(matte*255).astype(np.uint8)),
                   REVISION/'masks'/f'{field.style}.png')
    print('Saved silhouette mattes; original images, LED positions and background anchors unchanged.')


if __name__ == '__main__':
    prepare()
