

// Chase effect — single dot moving along the strip
// speed: frames between steps
// 中文：单个光点沿灯带追逐移动
function effectChase(r, g, b, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    var pos = _phasePosition(speed, count);
    var i = 0;
    while (i < count) {
        var dist = _circularDistance(i, pos, count);
        var bright = 0;
        if (dist <= 0.6) {
            bright = 255;
        } else if (dist <= 1.5) {
            bright = 210 - ((dist - 0.6) * 170);
        }
        bright = clamp(bright, 0, 255);
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}