
// Generic study primitive. The participant edits independent spatial, motion,
// intensity, color, and timing dimensions; this function only renders them.
function effectStudySegment(r1, g1, b1, r2, g2, b2, zoneStartPercent, zoneEndPercent, motion, direction, widthPercent, envelope, duration, pulseEvery, pulseActive) {
    var count = getLedCount();
    if (count < 1) { return; }
    var zoneStart = (count * clamp(zoneStartPercent, 0, 99)) / 100;
    var zoneEnd = (count * clamp(zoneEndPercent, 1, 100)) / 100;
    var zoneCount = zoneEnd - zoneStart;
    if (zoneCount < 1) { zoneCount = 1; }
    duration = _atLeastOne(duration);
    var progress = clamp(_frame / duration, 0, 1);
    var colorMix = clamp(progress * 255, 0, 255);
    var r = lerp(r1, r2, colorMix);
    var g = lerp(g1, g2, colorMix);
    var b = lerp(b1, b2, colorMix);
    var level = 1;
    if (envelope == 1) { level = progress; }
    if (envelope == 2) { level = 1 - progress; }
    if (envelope == 3) {
        level = _smoothPulseLevel(pulseEvery, pulseActive);
    }
    var width = (zoneCount * clamp(widthPercent, 1, 100)) / 100;
    if (width < 1) { width = 1; }
    var center = zoneStart + (zoneCount - 1) / 2;
    if (motion == 1) {
        center = zoneStart + progress * (zoneCount - 1);
        if (direction < 0) { center = zoneEnd - 1 - progress * (zoneCount - 1); }
    }
    if (motion == 2) { width = width * progress; if (width < 1) { width = 1; } }
    if (motion == 3) { width = width * (1 - progress); if (width < 1) { width = 1; } }
    if (motion == 4) {
        var phase = progress * 2;
        if (phase > 1) { phase = 2 - phase; }
        center = zoneStart + phase * (zoneCount - 1);
    }
    var i = 0;
    while (i < count) {
        var active = abs(i - center) <= width / 2;
        if (active && level > 0) {
            led(i, r * level, g * level, b * level);
        }
        i = i + 1;
    }
}