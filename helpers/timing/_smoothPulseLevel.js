

// A normal pulse is a continuous brightness envelope, not a binary visibility gate.
// pulseActive describes the occupied part of its period; the remainder rests at zero.
function _smoothPulseLevel(pulseEvery, pulseActive) {
    pulseEvery = _atLeastOne(pulseEvery);
    pulseActive = clamp(pulseActive, 1, pulseEvery);
    var phase = _positiveMod(_frame, pulseEvery);
    if (phase >= pulseActive) { return 0; }
    var midpoint = pulseActive / 2;
    if (midpoint < 1) { return 1; }
    return clamp(1 - abs(phase - midpoint) / midpoint, 0, 1);
}