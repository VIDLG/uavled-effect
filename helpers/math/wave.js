

// Smooth wave 0-255 (period in frames)
function wave(period) {
    period = _atLeastOne(period);
    var pos = (_frame * 256 / period) % 256;
    var s = sin255(pos);
    return (s + 255) / 2;
}