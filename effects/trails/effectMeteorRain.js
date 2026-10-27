

// --- Meteor with random sparkle decay ---
// 中文：流星雨效果，拖尾带轻微随机闪烁
function effectMeteorRain(r, g, b, tailLen, speed) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    tailLen = _atLeastOne(tailLen);
    var totalLen = count + tailLen + 2;
    var primary = _phasePosition(speed, totalLen) - tailLen;
    var secondary = _phasePosition(speed + 2, totalLen + count / 2) - tailLen - (count / 2);
    var i = 0;
    while (i < count) {
        var rr = 0; var gg = 0; var bb = 0;
        var meteorIndex = 0;
        while (meteorIndex < 2) {
            var head = meteorIndex == 0 ? primary : secondary;
            var dist = head - i;
            if (dist >= 0 && dist <= tailLen + 2) {
                var fade = 255 - (dist * (meteorIndex == 0 ? 185 : 220) / (tailLen + 2));
                if (fade < 0) { fade = 0; }
                var shimmer = 170 + ((sin255((_frame * 11 + i * 31 + meteorIndex * 80) % 256) + 255) * 70) / 255;
                var bright = clamp((fade * shimmer) / 255, 0, 255);
                rr = clamp(rr + ((r * bright) / 255), 0, 255);
                gg = clamp(gg + ((g * bright) / 255), 0, 255);
                bb = clamp(bb + ((b * bright) / 255), 0, 255);
                if (dist < 0.7) {
                    rr = clamp(rr + 40, 0, 255);
                    gg = clamp(gg + 40, 0, 255);
                    bb = clamp(bb + 60, 0, 255);
                }
            }
            meteorIndex = meteorIndex + 1;
        }
        var sparkle = (sin255((_frame * 13 + i * 41) % 256) + 255) / 2;
        if (sparkle > 235) {
            rr = clamp(rr + 18, 0, 255);
            gg = clamp(gg + 18, 0, 255);
            bb = clamp(bb + 28, 0, 255);
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}