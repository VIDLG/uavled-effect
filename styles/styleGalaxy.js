

// --- Galaxy (deep purple/blue with star sparkles) ---
// 中文：银河风格，深蓝紫底色上点缀零星星光
function styleGalaxy() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var nebula = (sin255((_frame * 2 + i * 34) % 256) + 255) / 2;
        var drift = (sin255((_frame * 3 + i * 15 + 140) % 256) + 255) / 2;
        var rr = 16 + (drift * 55) / 255;
        var gg = (nebula * 18) / 255;
        var bb = 70 + (nebula * 120) / 255;
        if (((_frame * 2 + i * 13) % 71) < 2) {
            rr = clamp(rr + 160, 0, 255);
            gg = clamp(gg + 180, 0, 255);
            bb = 255;
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}