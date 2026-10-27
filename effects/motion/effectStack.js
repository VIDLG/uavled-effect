

// --- Stack (LEDs fill up one by one then drain) ---
// 中文：堆叠效果，从一端逐颗填满再逐颗退回
function effectStack(r, g, b, speed) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    var cycle = count * 2;
    var pos = (_frame / speed) % cycle;
    var fillLevel = 0;
    if (pos < count) { fillLevel = pos; } else { fillLevel = cycle - pos; }
    var i = 0;
    while (i < count) {
        if (i <= fillLevel) {
            led(i, r, g, b);
        } else {
            led(i, 0, 0, 0);
        }
        i = i + 1;
    }
}