

// Returns pseudo-random number 0 to max-1
function random(max) {
    if (max < 1) { return 0; }
    return _nextRandom32() % max;
}