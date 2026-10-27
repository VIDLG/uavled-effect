

function beginEffectZone(startPercent, endPercent, blendMode, blendOpacity) {
    if (startPercent < 0) { startPercent = 0; }
    if (endPercent > 100) { endPercent = 100; }
    if (endPercent <= startPercent) { endPercent = startPercent + 1; }
    _effectZoneStart = startPercent;
    _effectZoneEnd = endPercent;
    _effectBlendMode = blendMode == undefined ? 0 : blendMode;
    _effectBlendOpacity = blendOpacity == undefined ? 100 : blendOpacity;
    if (_effectBlendOpacity < 0) { _effectBlendOpacity = 0; }
    if (_effectBlendOpacity > 100) { _effectBlendOpacity = 100; }
}