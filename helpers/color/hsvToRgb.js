

// ============================================================
// Color Utilities (integer math)
// ============================================================

// HSV to RGB (h: 0-359, s: 0-255, v: 0-255)
// Returns array [r, g, b]
function hsvToRgb(h, s, v) {
    if (s == 0) { return [v, v, v]; }

    h = h % 360;
    if (h < 0) { h = h + 360; }

    var region = h / 60;
    var remainder = (h - (region * 60)) * 255 / 60;

    var p = (v * (255 - s)) / 255;
    var q = (v * (255 - (s * remainder) / 255)) / 255;
    var t = (v * (255 - (s * (255 - remainder)) / 255)) / 255;

    if (region == 0) { return [v, t, p]; }
    if (region == 1) { return [q, v, p]; }
    if (region == 2) { return [p, v, t]; }
    if (region == 3) { return [p, q, v]; }
    if (region == 4) { return [t, p, v]; }
    return [v, p, q];
}