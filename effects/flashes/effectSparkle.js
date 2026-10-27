

// Internal state for sparkle/twinkle effects
var _sparkleR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _sparkleG = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _sparkleB = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _twinklePhase = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _twinkleSpeed = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _twinkleActive = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// --- Sparkle (random twinkle) ---
// 中文：单色星闪，随机点亮并带短暂残影
function effectSparkle(r, g, b, density) {
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
            _sparkleR[i] = r;
            _sparkleG[i] = g;
            _sparkleB[i] = b;
        }
        led(i, _sparkleR[i], _sparkleG[i], _sparkleB[i]);
        i = i + 1;
    }
}