

// ============================================================
// Pseudo-random number generator (xorshift32)
// ============================================================

var _rngState = 2463534242;

function seedRandom(s) {
    _rngState = (s ^ 1831565813) >>> 0;
    if (_rngState == 0) { _rngState = 1; }
}