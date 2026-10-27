

// --- Lava (red-orange-yellow pulsing) ---
// 中文：熔岩风格，偏红橙的热流起伏
function styleLava() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var w = sin255((_frame * 2 + i * 45) % 256);
        var heat = (w + 255) / 2;
        var rr = 180 + (heat * 75) / 255;
        if (rr > 255) { rr = 255; }
        var gg = (heat * 120) / 255;
        var bb = (heat * 20) / 255;
        led(i, rr, gg, bb);
        i = i + 1;
    }
}