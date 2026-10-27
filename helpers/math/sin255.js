

// Integer sine approximation (0-255 input, returns -255..255)
// Uses parabolic approximation
function sin255(x) {
    x = x % 256;
    if (x < 0) { x = x + 256; }
    var sign = 1;
    var q = x;
    if (q >= 128) {
        sign = -1;
        q = q - 128;
    }
    if (q > 64) {
        q = 128 - q;
    }
    var tri = (q * 255) / 64;
    var smooth = (tri * (510 - tri)) / 255;
    return sign * smooth;
}