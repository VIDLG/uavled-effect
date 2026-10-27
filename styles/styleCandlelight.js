

// --- Candlelight (warm flickering) ---
// 中文：烛光风格，暖黄橙色细碎抖动
var _candleLevel = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _candleTarget = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var _candleDelay = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

function styleCandlelight() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        if (_candleLevel[i] === undefined || _candleLevel[i] == 0) {
            _candleLevel[i] = 160 + random(32);
            _candleTarget[i] = _candleLevel[i];
            _candleDelay[i] = 1 + random(3);
        }
        if (_candleDelay[i] <= 0) {
            _candleDelay[i] = 1 + random(5);
            _candleTarget[i] = 138 + random(96);
            if (random(100) < 14) {
                _candleTarget[i] = 225 + random(24);
            }
        } else {
            _candleDelay[i] = _candleDelay[i] - 1;
        }
        if (_candleLevel[i] < _candleTarget[i]) {
            _candleLevel[i] = _candleLevel[i] + 7;
            if (_candleLevel[i] > _candleTarget[i]) { _candleLevel[i] = _candleTarget[i]; }
        } else if (_candleLevel[i] > _candleTarget[i]) {
            _candleLevel[i] = _candleLevel[i] - 6;
            if (_candleLevel[i] < _candleTarget[i]) { _candleLevel[i] = _candleTarget[i]; }
        }
        var flicker = _candleLevel[i];
        var warm = (sin255((_frame * 9 + i * 19) % 256) + 255) / 2;
        var rr = clamp(flicker + warm / 9, 0, 255);
        var gg = clamp((rr * 116) / 255 + 24, 0, 255);
        var bb = clamp((rr * 20) / 255, 0, 255);
        led(i, rr, gg, bb);
        i = i + 1;
    }
}