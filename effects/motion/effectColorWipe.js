

// --- Color wipe (fill from one end, then clear) ---
// 中文：颜色擦除，从一端铺满后再按相同方向退场
function effectColorWipe(r, g, b, speed) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    var cycle = count * 2;
    var pos = (_frame / speed) % cycle;
    var i = 0;
    while (i < count) {
        if (pos < count) {
            // Fill phase
            if (i <= pos) { led(i, r, g, b); } else { led(i, 0, 0, 0); }
        } else {
            // Clear phase
            var clearPos = pos - count;
            if (i <= clearPos) { led(i, 0, 0, 0); } else { led(i, r, g, b); }
        }
        i = i + 1;
    }
}