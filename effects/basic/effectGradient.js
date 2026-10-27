

// --- Gradient (static or scrolling gradient between two colors) ---
// 中文：双端渐变，可静态显示也可沿灯带滚动
function effectGradient(r1, g1, b1, r2, g2, b2, scroll) {
    var count = getLedCount();
    if (count < 1) { return; }
    if (count == 1) {
        led(0, r1, g1, b1);
        return;
    }
    var i = 0;
    while (i < count) {
        var t = ((i * 255) / (count - 1) + _frame * scroll) % 256;
        if (t < 0) { t = t + 256; }
        led(i, lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
        i = i + 1;
    }
}