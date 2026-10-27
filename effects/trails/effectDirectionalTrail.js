

// Directional comet with an explicit logical-path direction.
function effectDirectionalTrail(r, g, b, tailLen, speed, direction) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    tailLen = _atLeastOne(tailLen) + 1;
    var pos = _phasePosition(speed, count);
    if (direction < 0) { pos = count - 1 - pos; }
    var i = 0;
    while (i < count) {
        var dist = direction < 0 ? i - pos : pos - i;
        if (dist < 0) { dist = dist + count; }
        if (dist <= tailLen + 1) {
            var bright = 255 - (dist * 255) / (tailLen + 1);
            bright = (bright * bright) / 255;
            led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        }
        i = i + 1;
    }
}