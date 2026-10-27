
function beginEffectComposition() {
    var count = getLedCount();
    _effectCompositionR = [];
    _effectCompositionG = [];
    _effectCompositionB = [];
    var i = 0;
    while (i < count) {
        _effectCompositionR[i] = 0;
        _effectCompositionG[i] = 0;
        _effectCompositionB[i] = 0;
        i = i + 1;
    }
    _effectCompositionActive = 1;
    setAll(0, 0, 0);
}