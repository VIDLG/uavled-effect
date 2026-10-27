

// Color wheel (0-767) — smooth RGB transition
// Returns array [r, g, b]
function wheel(pos) {
    pos = pos % 768;
    if (pos < 0) { pos = pos + 768; }

    if (pos < 256) {
        return [255 - pos, pos, 0];
    }
    if (pos < 512) {
        pos = pos - 256;
        return [0, 255 - pos, pos];
    }
    pos = pos - 512;
    return [pos, 0, 255 - pos];
}