

function _nextRandom32() {
    var x = _rngState >>> 0;
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    _rngState = x >>> 0;
    return _rngState;
}