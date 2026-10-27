

// Turn all LEDs off
function clear() {
    if (_effectCompositionActive == 1 && _effectBlendMode != 0) {
        return;
    }
    if (_effectZoneStart == 0 && _effectZoneEnd == 100) {
        setAll(0, 0, 0);
        if (_effectCompositionActive == 1) {
            var fullCount = getLedCount();
            var fullIndex = 0;
            while (fullIndex < fullCount) {
                _effectCompositionR[fullIndex] = 0;
                _effectCompositionG[fullIndex] = 0;
                _effectCompositionB[fullIndex] = 0;
                fullIndex = fullIndex + 1;
            }
        }
        return;
    }
    var count = getLedCount();
    var start = (count * _effectZoneStart) / 100;
    var end = (count * _effectZoneEnd) / 100;
    if (end <= start) { end = start + 1; }
    var i = start;
    while (i < end) {
        setLed(i, 0, 0, 0);
        if (_effectCompositionActive == 1) {
            _effectCompositionR[i] = 0;
            _effectCompositionG[i] = 0;
            _effectCompositionB[i] = 0;
        }
        i = i + 1;
    }
}