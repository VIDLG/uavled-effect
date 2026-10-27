

function wheelRgbG(pos) {
    pos = pos % 768;
    if (pos < 0) { pos = pos + 768; }
    if (pos < 256) { return pos; }
    if (pos < 512) {
        pos = pos - 256;
        return 255 - pos;
    }
    return 0;
}