

// 中文：柔和星烁，每颗灯独立淡入淡出
function effectTwinkle(r, g, b) {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        if (_twinklePhase[i] === undefined) { _twinklePhase[i] = 0; }
        if (_twinkleSpeed[i] === undefined) { _twinkleSpeed[i] = 0; }
        if (_twinkleActive[i] === undefined) { _twinkleActive[i] = 0; }
        if (_twinkleActive[i] == 0) {
            if (random(1000) < 18) {
                _twinkleActive[i] = 1;
                _twinklePhase[i] = 0;
                _twinkleSpeed[i] = 4 + random(8);
            }
            led(i, 0, 0, 0);
            i = i + 1;
            continue;
        }
        _twinklePhase[i] = _twinklePhase[i] + _twinkleSpeed[i];
        var p = _twinklePhase[i];
        var bright = 0;
        if (p < 256) { bright = p; } else { bright = 511 - p; }
        if (bright < 0) { bright = 0; }
        if (p >= 511) {
            _twinklePhase[i] = 0;
            _twinkleActive[i] = 0;
            bright = 0;
        }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}