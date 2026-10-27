

function wheelRgbR(pos) {
    pos = pos % 768;
    if (pos < 0) { pos = pos + 768; }
    if (pos < 256) { return 255 - pos; }
    if (pos < 512) { return 0; }
    pos = pos - 512;
    return pos;
}