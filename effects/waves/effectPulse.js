

// --- Pulse (expanding from center) ---
// Radiates outward from center, with color
// 中文：脉冲扩散，从中心向两侧推出一圈亮带
function effectPulse(r, g, b, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    var center = (count - 1) / 2;
    var maxDist = center + 1;
    var cycleFrames = speed * (count + 6);
    if (cycleFrames < 24) { cycleFrames = 24; }
    var waveFront = (_positiveMod(_frame, cycleFrames) * (maxDist + 1.5)) / cycleFrames;
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        var diff = abs(dist - waveFront);
        var bright = 255 - diff * 170;
        if (waveFront < 0.8) {
            bright = bright + (0.8 - waveFront) * 80;
        }
        if (bright < 0) { bright = 0; }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}