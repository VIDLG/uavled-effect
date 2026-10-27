

// Write HSV color directly to one LED without allocating an RGB array
function ledHsv(i, h, s, v) {
    if (s == 0) {
        led(i, v, v, v);
        return;
    }

    h = h % 360;
    if (h < 0) { h = h + 360; }

    var region = h / 60;
    var remainder = (h - (region * 60)) * 255 / 60;

    var p = (v * (255 - s)) / 255;
    var q = (v * (255 - (s * remainder) / 255)) / 255;
    var t = (v * (255 - (s * (255 - remainder)) / 255)) / 255;

    if (region == 0) { led(i, v, t, p); return; }
    if (region == 1) { led(i, q, v, p); return; }
    if (region == 2) { led(i, p, v, t); return; }
    if (region == 3) { led(i, p, q, v); return; }
    if (region == 4) { led(i, t, p, v); return; }
    led(i, v, p, q);
}