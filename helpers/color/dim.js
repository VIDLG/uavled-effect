

// Dim a color by factor (0-255)
function dim(c, factor) {
    return [(c[0] * factor) / 255, (c[1] * factor) / 255, (c[2] * factor) / 255];
}