

// Deterministic EffectPlan segment renderer. Space is the one-dimensional
// upper-to-lower logical path; the visualizer mirrors that same path on both arms.
function effectPlanSegment(r1, g1, b1, r2, g2, b2, zoneStartPercent, zoneEndPercent, motion, direction, widthPercent, envelope, duration, pulseEvery, pulseActive, cadence) {
    var count = getLedCount();
    if (count < 1) { return; }
    var zoneStart = (count * clamp(zoneStartPercent, 0, 99)) / 100;
    var zoneEnd = (count * clamp(zoneEndPercent, 1, 100)) / 100;
    var zoneCount = zoneEnd - zoneStart;
    if (zoneCount < 1) { zoneCount = 1; }
    duration = _atLeastOne(duration);
    var progress = clamp(_frame / duration, 0, 1);
    var colorMix = clamp(progress * 255, 0, 255);
    var level = 1;
    if (envelope == 1) { level = progress; }
    if (envelope == 2) { level = 1 - progress; }
    if (cadence == 1) {
        level = level * _smoothPulseLevel(pulseEvery, pulseActive);
    } else if (envelope == 3) {
        // Legacy Plan pulse timing remains a smooth envelope during migration.
        level = _smoothPulseLevel(pulseEvery, pulseActive);
    }
    if (motion == 8) {
        var breathePhase = progress * 2;
        if (breathePhase > 1) { breathePhase = 2 - breathePhase; }
        level = level * breathePhase;
    }
    if (motion == 9 && envelope == 0) { level = 1 - progress; }
    if (cadence == 2 || motion == 7) {
        pulseEvery = _atLeastOne(pulseEvery);
        pulseActive = clamp(pulseActive, 1, pulseEvery);
        level = (_positiveMod(_frame, pulseEvery) < pulseActive) ? level : 0;
    }
    var width = (zoneCount * clamp(widthPercent, 1, 100)) / 100;
    if (width < 1) { width = 1; }
    var center = zoneStart + (zoneCount - 1) / 2;
    if (motion == 1 || motion == 3) {
        center = zoneStart + progress * (zoneCount - 1);
        if (direction < 0) { center = zoneEnd - 1 - progress * (zoneCount - 1); }
    }
    if (motion == 10 || direction == 3) {
        var reboundPhase = progress * 2;
        if (reboundPhase > 1) { reboundPhase = 2 - reboundPhase; }
        center = zoneStart + reboundPhase * (zoneCount - 1);
    }
    var maxRadius = zoneCount / 2;
    var i = 0;
    while (i < count) {
        var inZone = i >= zoneStart && i < zoneEnd;
        var distance = abs(i - (zoneStart + (zoneCount - 1) / 2));
        var active = inZone && abs(i - center) <= width / 2;
        var localLevel = level;
        if (motion == 2 || direction == 2 || direction == -2) {
            var radius = progress * maxRadius;
            if (direction == -2) { radius = (1 - progress) * maxRadius; }
            active = inZone && abs(distance - radius) <= width / 2;
        }
        if (motion == 4) {
            var particle = _positiveMod(i * 17 + (_frame / 3) * 13, 100);
            active = inZone && particle < widthPercent;
        }
        if (motion == 5) {
            active = inZone && _positiveMod(i * 7 + _frame, 20) < clamp(widthPercent / 5, 1, 12);
        }
        if (motion == 6) {
            var local = (i - zoneStart) / zoneCount;
            if (direction == -1) { local = 1 - local; }
            if (direction == 2) { local = distance / maxRadius; }
            if (direction == -2) { local = 1 - distance / maxRadius; }
            active = inZone && local <= progress;
        }
        if (motion == 7 || motion == 8 || motion == 9) { active = inZone; }
        if (motion == 11) {
            active = inZone;
            colorMix = clamp(((i - zoneStart) * 255) / zoneCount + progress * 255, 0, 255);
        }
        if (motion == 12) {
            active = inZone;
            localLevel = level * sin255(i * 31 + _frame * 13) / 255;
        }
        if (active && localLevel > 0) {
            var r = lerp(r1, r2, colorMix);
            var g = lerp(g1, g2, colorMix);
            var b = lerp(b1, b2, colorMix);
            led(i, r * localLevel, g * localLevel, b * localLevel);
        }
        i = i + 1;
    }
}