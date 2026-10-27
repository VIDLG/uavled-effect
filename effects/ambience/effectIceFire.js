

// --- Ice/Blue Fire ---
// 中文：冰焰效果，结构和火焰相同但偏冷蓝色
function effectIceFire(intensity) {
    intensity = clamp(intensity, 0, 10);
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var cooling = random(20) + 10;
        if (_fireHeat[i] === undefined) { _fireHeat[i] = 0; }
        _fireHeat[i] = _fireHeat[i] - cooling;
        if (_fireHeat[i] < 0) { _fireHeat[i] = 0; }
        i = i + 1;
    }
    i = count - 1;
    while (i >= 2) {
        _fireHeat[i] = (_fireHeat[i - 1] + _fireHeat[i - 2] + _fireHeat[i - 2]) / 3;
        i = i - 1;
    }
    if (random(10) < intensity) {
        var spark = random(3);
        _fireHeat[spark] = _fireHeat[spark] + random(100) + 160;
        if (_fireHeat[spark] > 600) { _fireHeat[spark] = 600; }
    }
    i = 0;
    while (i < count) {
        var h = _fireHeat[i];
        if (h === undefined) { h = 0; }
        var rr = 0; var gg = 0; var bb = 0;
        if (h > 0) {
            bb = h / 2;
            if (bb > 255) { bb = 255; }
            gg = (h - 200) / 2;
            if (gg < 0) { gg = 0; }
            if (gg > 255) { gg = 255; }
            rr = (h - 450);
            if (rr < 0) { rr = 0; }
            if (rr > 255) { rr = 255; }
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}