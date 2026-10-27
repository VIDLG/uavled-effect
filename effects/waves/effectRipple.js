

// --- Ripple (traveling rings from center) ---
function effectRipple(r, g, b, speed, spacing) {
    var count = getLedCount();
    if (count < 1) { return; }
    speed = _atLeastOne(speed);
    spacing = _atLeastOne(spacing);
    var center = (count - 1) / 2;
    var i = 0;
    while (i < count) {
        var dist = abs(i - center);
        var phase = (_frame * speed * 10 - dist * spacing * 30) % 256;
        if (phase < 0) { phase = phase + 256; }
        var waveBright = sin255(phase);
        if (waveBright < 0) { waveBright = 0; }
        waveBright = (waveBright * waveBright) / 255;
        var base = 10 + ((sin255((_frame * 3 + i * 18) % 256) + 255) * 20) / 255;
        var bright = base + (waveBright * 215) / 255;
        if (bright > 255) { bright = 255; }
        led(i, (r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
        i = i + 1;
    }
}