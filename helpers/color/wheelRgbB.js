

function wheelRgbB(pos) {
    pos = pos % 768;
    if (pos < 0) { pos = pos + 768; }
    if (pos < 256) { return 0; }
    if (pos < 512) {
        pos = pos - 256;
        return pos;
    }
    pos = pos - 512;
    return 255 - pos;
}