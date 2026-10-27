

// --- Ocean (blue-green waves) ---
// 中文：海洋风格，蓝绿波纹彼此叠加
function styleOcean() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var w1 = sin255((_frame * 3 + i * 30) % 256);
        var w2 = sin255((_frame * 2 + i * 50 + 128) % 256);
        var combined = (w1 + w2 + 510) / 4;
        var rr = 0;
        var gg = (combined * 180) / 255;
        var bb = 80 + (combined * 175) / 255;
        led(i, rr, gg, bb);
        i = i + 1;
    }
}