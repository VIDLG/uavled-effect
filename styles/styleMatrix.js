

// --- Matrix (green digital rain) ---
var _matrixDrops = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// 中文：矩阵风格，绿色数字雨般的短促落点
function styleMatrix() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        if (_matrixDrops[i] === undefined) { _matrixDrops[i] = 0; }
        if (_matrixDrops[i] > 0) {
            var v = _matrixDrops[i];
            led(i, 0, v, (v * 30) / 255);
            _matrixDrops[i] = v - 15;
            if (_matrixDrops[i] < 0) { _matrixDrops[i] = 0; }
        } else {
            led(i, 0, 0, 0);
            if (random(40) < 2) {
                _matrixDrops[i] = 200 + random(55);
            }
        }
        i = i + 1;
    }
}