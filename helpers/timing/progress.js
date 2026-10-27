

// Get progress (0-255) through a duration starting from startFrame
function progress(startFrame, durationFrames) {
    var p = ((_frame - startFrame) * 255) / durationFrames;
    if (p < 0) { p = 0; }
    if (p > 255) { p = 255; }
    return p;
}