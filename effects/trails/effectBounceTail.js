

// --- Bounce with tail ---
// 中文：带拖尾的来回弹跳光点
function effectBounceTail(r, g, b, tailLen, speed) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    var period = (count - 1) * 2;
    if (period < 2) { period = 2; }
    var raw = (_frame / speed) % period;
    var pos = 0;
    if (raw < count) { pos = raw; } else { pos = period - raw; }
    clear();
    var i = 0;
    while (i < count) {
        var dist = abs(i - pos);
        if (dist <= tailLen) {
            var bright = 255 - (dist * 255 / (tailLen + 1));
            led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        }
        i = i + 1;
    }
}