

// ============================================================
// Advanced Effect Patterns
// ============================================================

// --- Meteor / Shooting Star ---
// A bright head with fading tail, moves along strip
// tailLen: length of fading tail, speed: frames per step, dir: 1=forward -1=reverse
// 中文：流星效果，明亮头部带单侧拖尾
function effectMeteor(r, g, b, tailLen, speed, dir) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    tailLen = _atLeastOne(tailLen);
    var totalLen = count + tailLen + 2;
    var pos = _phasePosition(speed, totalLen) - tailLen;
    if (dir < 0) { pos = (count - 1) - pos; }
    var i = 0;
    while (i < count) {
        var dist = pos - i;
        if (dir < 0) { dist = i - pos; }
        var rr = 0; var gg = 0; var bb = 0;
        if (dist >= 0 && dist <= tailLen + 1) {
            var fade = 255 - (dist * 210 / (tailLen + 1));
            if (fade < 0) { fade = 0; }
            var tailBright = (fade * fade) / 255;
            rr = (r * tailBright) / 255;
            gg = (g * tailBright) / 255;
            bb = (b * tailBright) / 255;
            if (dist < 0.7) {
                rr = clamp(rr + 90, 0, 255);
                gg = clamp(gg + 90, 0, 255);
                bb = clamp(bb + 90, 0, 255);
            }
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}