

// Two mirrored strands grow from the center and retain a dim trailing filament.
function effectTendril(r, g, b, duration, width) {
    var count = getLedCount();
    if (count < 1) { return; }
    duration = _atLeastOne(duration);
    width = _atLeastOne(width);
    var center = (count - 1) / 2;
    var maxDist = center + 0.5;
    var progress = clamp(_frame / duration, 0, 1);
    var front = progress * maxDist;
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        var bright = 0;
        if (dist <= front) {
            bright = 24 + 231 - ((front - dist) * 231) / width;
            if (bright < 24) { bright = 24; }
        }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}