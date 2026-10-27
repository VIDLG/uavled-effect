

// Blink effect — on/off at interval
// onFrames: frames on, offFrames: frames off
// Returns 1 or 0
function blink(onFrames, offFrames) {
    onFrames = clamp(onFrames, 0, 2147483647);
    offFrames = clamp(offFrames, 0, 2147483647);
    var cycle = onFrames + offFrames;
    cycle = _atLeastOne(cycle);
    var pos = _frame % cycle;
    if (pos < onFrames) { return 1; }
    return 0;
}