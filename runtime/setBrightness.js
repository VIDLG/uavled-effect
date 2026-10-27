

// Set global brightness (0-255)
function setBrightness(b) {
    if (b < 0) { b = 0; }
    if (b > 255) { b = 255; }
    _brightness = b;
}