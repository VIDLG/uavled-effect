

// --- Wave effect ---
// Smooth sine-like wave traveling along strip
// 中文：波浪效果，亮度像波峰一样沿灯带推进
function effectWave(r, g, b, speed, waveLen) {
    var count = getLedCount();
    if (count < 1) { return; }
    waveLen = _atLeastOne(waveLen);
    var i = 0;
    while (i < count) {
        var phase = (_frame * speed * 4 + i * 256 / waveLen) % 256;
        var s = sin255(phase);
        var bright = 40 + ((s + 255) * 215) / 510;
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}