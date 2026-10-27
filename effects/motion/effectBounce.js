

// --- Bounce (dot bouncing back and forth) ---
// 中文：来回弹跳的单光点
function effectBounce(r, g, b, speed) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    var period = (count - 1) * 2;
    if (period < 2) { period = 2; }
    var raw = (_frame / speed) % period;
    var pos = 0;
    if (raw < count) { pos = raw; } else { pos = period - raw; }
    clear();
    led(pos, r, g, b);
}