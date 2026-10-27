

// --- Rainbow wave (rainbow + wave motion) ---
// 中文：彩虹波浪，颜色变化和亮度波动同时推进
function effectRainbowWave(speed, waveSpeed) {
    var count = getLedCount();
    if (count < 1) { return; }
    var i = 0;
    while (i < count) {
        var crest = (sin255((_frame * waveSpeed * 5 + i * 28) % 256) + 255) / 2;
        var hue = (_frame * speed * 3 + i * (540 / count) + crest / 5) % 360;
        var sat = 170 + (crest * 85) / 255;
        var bright = 55 + (crest * 200) / 255;
        ledHsv(i, hue, sat, bright);
        i = i + 1;
    }
}
