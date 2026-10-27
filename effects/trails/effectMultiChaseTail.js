

// --- Multi-chase with tails ---
// 中文：多光点拖尾追逐，比纯追逐更有速度感
function effectMultiChaseTail(r, g, b, numDots, tailLen, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    numDots = _atLeastOne(numDots);
    tailLen = _atLeastOne(tailLen);
    speed = _atLeastOne(speed);
    var spacing = count / numDots;
    if (spacing < 1) { spacing = 1; }
    var offset = _phasePosition(speed, count);
    var i = 0;
    while (i < count) {
        var bright = 0;
        var d = 0;
        while (d < numDots) {
            var headPos = _positiveMod(offset + d * spacing, count);
            var dist = headPos - i;
            if (dist < 0) { dist = dist + count; }
            if (dist >= 0 && dist <= tailLen + 1) {
                var candidate = 255 - (dist * 210 / (tailLen + 1));
                if (dist > 0) {
                    candidate = (candidate * candidate) / 255;
                }
                if (candidate > bright) { bright = candidate; }
            }
            d = d + 1;
        }
        bright = clamp(bright, 0, 255);
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}