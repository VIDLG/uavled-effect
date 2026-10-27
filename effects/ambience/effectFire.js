

// --- Fire / Flame simulation ---
// Heat-based fire effect, intensity 1-10
var _fireHeat = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// 中文：火焰模拟，自底向上扩散的热量效果
function effectFire(intensity) {
    intensity = clamp(intensity, 0, 10);
    var count = getLedCount();
    var i = 0;
    // Step 1: cool down
    while (i < count) {
        var cooling = random(20) + 10;
        if (_fireHeat[i] === undefined) { _fireHeat[i] = 0; }
        _fireHeat[i] = _fireHeat[i] - cooling;
        if (_fireHeat[i] < 0) { _fireHeat[i] = 0; }
        i = i + 1;
    }
    // Step 2: heat diffuse upward
    i = count - 1;
    while (i >= 2) {
        _fireHeat[i] = (_fireHeat[i - 1] + _fireHeat[i - 2] + _fireHeat[i - 2]) / 3;
        i = i - 1;
    }
    // Step 3: ignite at bottom
    if (random(10) < intensity) {
        var spark = random(3);
        _fireHeat[spark] = _fireHeat[spark] + random(100) + 160;
        if (_fireHeat[spark] > 600) { _fireHeat[spark] = 600; }
    }
    // Step 4: map heat to color
    i = 0;
    while (i < count) {
        var h = _fireHeat[i];
        if (h === undefined) { h = 0; }
        var rr = 0; var gg = 0; var bb = 0;
        if (h > 0) {
            rr = h / 2;
            if (rr > 255) { rr = 255; }
            gg = (h - 200) / 2;
            if (gg < 0) { gg = 0; }
            if (gg > 255) { gg = 255; }
            bb = (h - 450);
            if (bb < 0) { bb = 0; }
            if (bb > 255) { bb = 255; }
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}