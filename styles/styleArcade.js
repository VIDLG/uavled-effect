

// --- Arcade (bold moving RGB bands) ---
function styleArcade() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var band = (_frame * 8 + i * 88) % 768;
        var glow = 155 + ((sin255((_frame * 5 + i * 18) % 256) + 255) * 75) / 255;
        var rr = (wheelRgbR(band) * glow) / 255;
        var gg = (wheelRgbG(band) * glow) / 255;
        var bb = (wheelRgbB(band) * glow) / 255;
        if (((_frame / 4) + i) % 6 == 0) {
            rr = clamp(rr + 26, 0, 255);
            bb = clamp(bb + 46, 0, 255);
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}