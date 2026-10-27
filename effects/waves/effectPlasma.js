

// --- Plasma (flowing multi-color field) ---
function effectPlasma(speed, scale) {
    var count = getLedCount();
    speed = _atLeastOne(speed);
    scale = _atLeastOne(scale);
    var i = 0;
    while (i < count) {
        var flow = (sin255((_frame * speed * 5 + i * 24) % 256) + 255) / 2;
        var swirl = (sin255((_frame * speed * 3 + (i * 256) / scale + 96) % 256) + 255) / 2;
        var colorPos = (_frame * speed * 14 + i * (768 / count) + flow + swirl) % 768;
        var bright = 70 + (swirl * 140) / 255;
        if (bright > 255) { bright = 255; }
        led(
            i,
            (wheelRgbR(colorPos) * bright) / 255,
            (wheelRgbG(colorPos) * bright) / 255,
            (wheelRgbB(colorPos) * bright) / 255
        );
        i = i + 1;
    }
}