

// --- Neon (bright saturated color bands) ---
// 中文：霓虹风格，高饱和彩色条带持续滚动
function styleNeon() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var hue = (_frame * 2 + i * 45) % 360;
        ledHsv(i, hue, 255, 255);
        i = i + 1;
    }
}