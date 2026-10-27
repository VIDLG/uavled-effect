

// --- Multi-dot chase ---
// numDots dots evenly spaced, chasing along the strip
// 中文：多光点追逐，多个光点等间距绕灯带前进
function effectMultiChase(r, g, b, numDots, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    numDots = _atLeastOne(numDots);
    speed = _atLeastOne(speed);
    var spacing = count / numDots;
    if (spacing < 1) { spacing = 1; }
    var offset = _phasePosition(speed, count);
    var i = 0;
    while (i < count) {
        var bright = 0;
        var d = 0;
        while (d < numDots) {
            var pos = _positiveMod(offset + d * spacing, count);
            var dist = _circularDistance(i, pos, count);
            var candidate = 0;
            if (dist <= 0.4) {
                candidate = 255;
            } else if (dist <= 0.95) {
                candidate = 180 - ((dist - 0.4) * 220);
            }
            if (candidate > bright) { bright = candidate; }
            d = d + 1;
        }
        bright = clamp(bright, 0, 255);
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}