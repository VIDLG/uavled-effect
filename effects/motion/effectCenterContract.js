

// A single wavefront travelling from both ends back toward the center.
function effectCenterContract(r, g, b, duration, width) {
    var count = getLedCount();
    if (count < 1) { return; }
    duration = _atLeastOne(duration);
    width = _atLeastOne(width);
    var center = (count - 1) / 2;
    var maxDist = center + 0.5;
    var progress = clamp(_frame / duration, 0, 1);
    var front = (1 - progress) * maxDist;
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        var bright = 255 - (abs(dist - front) * 255) / width;
        if (bright < 0) { bright = 0; }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}