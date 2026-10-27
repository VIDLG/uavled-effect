

// --- Aurora (northern lights) ---
// 中文：极光风格，绿色到青紫色的流动幕布
function styleAurora() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var curtain = (sin255((_frame * 2 + i * 28) % 256) + 255) / 2;
        var shimmer = (sin255((_frame * 3 + i * 17 + 96) % 256) + 255) / 2;
        var hue = 92 + ((curtain * 48) / 255) - ((shimmer * 18) / 255);
        var sat = 180 + (shimmer * 55) / 255;
        var val = 45 + ((curtain + shimmer) * 95) / 510;
        ledHsv(i, hue, sat, val);
        i = i + 1;
    }
}