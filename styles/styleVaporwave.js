

// --- Vaporwave (pastel pink / purple / cyan) ---
// 中文：蒸汽波风格，粉紫青之间缓慢漂移
function styleVaporwave() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var phase = (_frame * 2 + i * 50) % 768;
        var rr = 0; var gg = 0; var bb = 0;
        if (phase < 256) {
            // Pink to purple
            rr = 255 - phase / 3;
            gg = 100 + phase / 6;
            bb = 180 + phase / 4;
        } else if (phase < 512) {
            // Purple to cyan
            var p = phase - 256;
            rr = 170 - (p * 150) / 256;
            gg = 140 + (p * 115) / 256;
            bb = 245;
        } else {
            // Cyan to pink
            var p2 = phase - 512;
            rr = 20 + (p2 * 235) / 256;
            gg = 255 - (p2 * 155) / 256;
            bb = 245 - (p2 * 65) / 256;
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}