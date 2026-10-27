

// Deterministic drifting highlights for bubble-like accents.
function effectBubble(r, g, b, duration, bubbleCount) {
    var count = getLedCount();
    if (count < 1) { return; }
    duration = _atLeastOne(duration);
    bubbleCount = clamp(_atLeastOne(bubbleCount), 1, 8);
    var progress = clamp(_frame / duration, 0, 1);
    var j = 0;
    while (j < bubbleCount) {
        var rawPos = (j * 7 + progress * (j + 2) * count * 0.35) % count;
        var pos = rawPos - (rawPos % 1);
        led(pos, r, g, b);
        if (pos + 1 < count) { led(pos + 1, r / 4, g / 4, b / 4); }
        j = j + 1;
    }
}