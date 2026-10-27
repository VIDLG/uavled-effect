

// --- Scanner (Larson scanner / KITT) ---
// 中文：扫描器效果，像 KITT 那样左右来回扫动
function effectScanner(r, g, b, width, speed) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    if (width < 0) { width = 0; }
    var period = (count - 1) * 2;
    if (period < 2) { period = 2; }
    var raw = (_frame / speed) % period;
    var center = 0;
    if (raw < count) { center = raw; } else { center = period - raw; }
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        if (dist <= width) {
            var bright = 255 - (dist * 255 / (width + 1));
            bright = (bright * bright) / 255;
            led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        } else {
            led(i, 0, 0, 0);
        }
        i = i + 1;
    }
}