

// --- Sunset (warm gradient shifting) ---
// 中文：日落风格，暖色渐变里带一点粉紫余晖
function styleSunset() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var horizon = (sin255((_frame * 8 + i * 22) % 256) + 255) / 2;
        var glow = (sin255((_frame * 9 + i * 11 + 64) % 256) + 255) / 2;
        var hue = 8 + (i * 10) + (horizon * 28) / 255;
        if (i > count / 2) {
            hue = hue + 36;
        }
        ledHsv(i, hue % 360, 220, 90 + ((glow + horizon) * 145) / 510);
        i = i + 1;
    }
}