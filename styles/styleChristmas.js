

// --- Christmas (red and green alternating with twinkle) ---
// 中文：圣诞风格，红绿交替并带轻微闪烁
function styleChristmas() {
    var count = getLedCount();
    var shift = (_frame / 30) % 2;
    var i = 0;
    while (i < count) {
        var group = (i + shift) % 2;
        var twinkle = 200 + random(55);
        if (group == 0) {
            led(i, twinkle, 0, 0);
        } else {
            led(i, 0, twinkle, 0);
        }
        i = i + 1;
    }
}