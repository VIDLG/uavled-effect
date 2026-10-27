

// Lerp between two RGB colors (t: 0-255)
// Returns array [r, g, b]
function lerpColor(c1, c2, t) {
    return [
        lerp(c1[0], c2[0], t),
        lerp(c1[1], c2[1], t),
        lerp(c1[2], c2[2], t)
    ];
}