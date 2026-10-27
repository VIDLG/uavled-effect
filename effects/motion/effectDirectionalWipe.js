

// One-shot fill from either logical-path endpoint.
function effectDirectionalWipe(r, g, b, duration, direction) {
    var count = getLedCount();
    if (count < 1) { return; }
    duration = _atLeastOne(duration);
    var progress = clamp(_frame / duration, 0, 1);
    var boundary = progress * count;
    var i = 0;
    while (i < count) {
        var active = direction < 0 ? i >= count - boundary : i < boundary;
        if (active) { led(i, r, g, b); }
        i = i + 1;
    }
}