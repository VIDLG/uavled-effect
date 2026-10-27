

// --- Comet (bright head, smooth gradient tail) ---
// 中文：彗星效果，头亮尾柔和，适合做滑顺扫光
function effectComet(r, g, b, tailLen, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    tailLen = _atLeastOne(tailLen) + 1;
    var pos = _phasePosition(speed, count);
    var i = 0;
    while (i < count) {
        var dist = pos - i;
        if (dist < 0) { dist = dist + count; }
        if (dist >= 0 && dist <= tailLen + 1) {
            var bright = 255 - (dist * 255 / (tailLen + 1));
            bright = (bright * bright) / 255;
            var halo = 0;
            if (dist < 0.75) {
                halo = 70;
            }
            led(
                i,
                clamp(((r * bright) / 255) + halo, 0, 255),
                clamp(((g * bright) / 255) + halo, 0, 255),
                clamp(((b * bright) / 255) + halo, 0, 255)
            );
        } else {
            led(i, 0, 0, 0);
        }
        i = i + 1;
    }
}