

// --- Color sparkle (random colors) ---
// 中文：彩色星闪，每次闪烁都会随机抽取颜色
function effectColorSparkle(density) {
    var count = getLedCount();
    density = clamp(density, 0, 100);
    var i = 0;
    while (i < count) {
        if (_sparkleR[i] === undefined) { _sparkleR[i] = 0; }
        if (_sparkleG[i] === undefined) { _sparkleG[i] = 0; }
        if (_sparkleB[i] === undefined) { _sparkleB[i] = 0; }
        _sparkleR[i] = (_sparkleR[i] * 180) / 255;
        _sparkleG[i] = (_sparkleG[i] * 180) / 255;
        _sparkleB[i] = (_sparkleB[i] * 180) / 255;
        if (random(100) < density) {
            var colorPos = random(768);
            _sparkleR[i] = wheelRgbR(colorPos);
            _sparkleG[i] = wheelRgbG(colorPos);
            _sparkleB[i] = wheelRgbB(colorPos);
        }
        led(i, _sparkleR[i], _sparkleG[i], _sparkleB[i]);
        i = i + 1;
    }
}