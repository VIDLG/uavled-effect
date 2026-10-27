

// --- Strobe (rapid full-brightness flash) ---
// 中文：频闪效果，整条灯带快速明灭
function effectStrobe(r, g, b, onFrames, offFrames) {
    onFrames = clamp(onFrames, 0, 2147483647);
    offFrames = clamp(offFrames, 0, 2147483647);
    var cycle = onFrames + offFrames;
    cycle = _atLeastOne(cycle);
    var pos = _frame % cycle;
    if (pos < onFrames) {
        fill(r, g, b);
    } else {
        clear();
    }
}