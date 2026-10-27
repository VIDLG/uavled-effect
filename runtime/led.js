

// Set LED with brightness and power limit applied
function led(i, r, g, b) {
    // Apply brightness
    r = (r * _brightness) / 255;
    g = (g * _brightness) / 255;
    b = (b * _brightness) / 255;

    // Apply power limit
    var total = r + g + b;
    if (total > _maxPower) {
        var scale = (_maxPower * 100) / total;
        r = (r * scale) / 100;
        g = (g * scale) / 100;
        b = (b * scale) / 100;
    }

    // Clamp
    if (r < 0) { r = 0; } if (r > 255) { r = 255; }
    if (g < 0) { g = 0; } if (g > 255) { g = 255; }
    if (b < 0) { b = 0; } if (b > 255) { b = 255; }

    var count = getLedCount();
    if (_effectZoneStart > 0 || _effectZoneEnd < 100) {
        if (i < 0 || i >= count) { return; }
        var start = (count * _effectZoneStart) / 100;
        var end = (count * _effectZoneEnd) / 100;
        if (end <= start) { end = start + 1; }
        var span = end - start;
        if (count > 1) {
            i = start + (i * (span - 1)) / (count - 1);
        } else {
            i = start;
        }
    }

    i = i | 0;
    if (_effectCompositionActive == 1) {
        var oldR = _effectCompositionR[i] || 0;
        var oldG = _effectCompositionG[i] || 0;
        var oldB = _effectCompositionB[i] || 0;
        var mixR = (r * _effectBlendOpacity) / 100;
        var mixG = (g * _effectBlendOpacity) / 100;
        var mixB = (b * _effectBlendOpacity) / 100;
        if (_effectBlendMode == 1) {
            r = oldR + mixR;
            g = oldG + mixG;
            b = oldB + mixB;
        } else if (_effectBlendMode == 2) {
            r = oldR > mixR ? oldR : mixR;
            g = oldG > mixG ? oldG : mixG;
            b = oldB > mixB ? oldB : mixB;
        } else if (_effectBlendMode == 3) {
            r = 255 - ((255 - oldR) * (255 - mixR)) / 255;
            g = 255 - ((255 - oldG) * (255 - mixG)) / 255;
            b = 255 - ((255 - oldB) * (255 - mixB)) / 255;
        } else {
            r = oldR + ((r - oldR) * _effectBlendOpacity) / 100;
            g = oldG + ((g - oldG) * _effectBlendOpacity) / 100;
            b = oldB + ((b - oldB) * _effectBlendOpacity) / 100;
        }
        if (r > 255) { r = 255; }
        if (g > 255) { g = 255; }
        if (b > 255) { b = 255; }
        _effectCompositionR[i] = r;
        _effectCompositionG[i] = g;
        _effectCompositionB[i] = b;
    }

    setLed(i, r, g, b);
}