

// --- Dual wave (two colors interleaved) ---
// 中文：双色波浪，两种颜色之间平滑往返过渡
function effectDualWave(r1, g1, b1, r2, g2, b2, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    var i = 0;
    while (i < count) {
        var phaseA = (_frame * speed * 5 + i * 48) % 256;
        var phaseB = _positiveMod(256 - (_frame * speed * 4) + i * 37 + 96, 256);
        var waveA = (sin255(phaseA) + 255) / 2;
        var waveB = (sin255(phaseB) + 255) / 2;
        var rr = clamp(((r1 * waveA) + (r2 * waveB)) / 255, 0, 255);
        var gg = clamp(((g1 * waveA) + (g2 * waveB)) / 255, 0, 255);
        var bb = clamp(((b1 * waveA) + (b2 * waveB)) / 255, 0, 255);
        led(i, rr, gg, bb);
        i = i + 1;
    }
}