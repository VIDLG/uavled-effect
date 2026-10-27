

// Returns to the center, then performs successively smaller rebounds.
function effectDampedRebound(r, g, b, duration, bounces) {
    var count = getLedCount();
    if (count < 1) { return; }
    duration = _atLeastOne(duration);
    bounces = clamp(_atLeastOne(bounces), 1, 5);
    var center = (count - 1) / 2;
    var maxDist = center + 0.5;
    var progress = clamp(_frame / duration, 0, 1);
    var phase = progress * bounces * 2;
    var segment = phase - (phase % 1);
    var local = phase - segment;
    var amplitude = maxDist * (1 - progress);
    var front = segment % 2 === 0 ? amplitude * (1 - local) : amplitude * local;
    var width = 1.5 + amplitude / 8;
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        var bright = 255 - (abs(dist - front) * 255) / width;
        if (bright < 0) { bright = 0; }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}