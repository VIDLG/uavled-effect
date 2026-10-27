

// ============================================================
// Color Palette Helpers
// ============================================================

// Blend two colors: ratio 0=c1, 255=c2
function blend(c1, c2, ratio) {
    return [
        lerp(c1[0], c2[0], ratio),
        lerp(c1[1], c2[1], ratio),
        lerp(c1[2], c2[2], ratio)
    ];
}