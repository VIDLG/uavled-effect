

// Linear interpolation between two values (t: 0-255)
function lerp(a, b, t) {
    return a + ((b - a) * t) / 255;
}