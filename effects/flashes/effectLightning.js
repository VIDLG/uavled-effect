

// --- Lightning / Flash ---
// Random bright white flash with afterglow
var _lightningTimer = 0;
var _lightningPos = 0;
var _lightningRecharge = 0;
var _lightningBursts = 0;
var _lightningWidth = 1;

// 中文：闪电效果，随机白光爆闪并带微弱余辉
function effectLightning(frequency) {
    var count = getLedCount();
    frequency = clamp(frequency, 1, 30);
    if (_lightningRecharge > 0) { _lightningRecharge = _lightningRecharge - 1; }
    if (_lightningTimer <= 0) {
        if (_lightningBursts > 0) {
            _lightningTimer = 1 + random(2);
            _lightningBursts = _lightningBursts - 1;
            _lightningPos = clamp(_lightningPos + random(5) - 2, 0, count - 1);
            _lightningWidth = 1 + random(3);
        } else if (_lightningRecharge == 0 && random(100) < frequency) {
            _lightningTimer = 2 + random(2);
            _lightningBursts = 1 + random(2);
            _lightningPos = random(count);
            _lightningWidth = 1 + random(2);
            _lightningRecharge = 8 + random(16);
        }
    }

    var ambient = 2 + ((sin255((_frame * 3) % 256) + 255) * 2) / 255;
    var i = 0;
    while (i < count) {
        led(i, ambient / 2, ambient / 2, ambient);
        i = i + 1;
    }

    if (_lightningTimer > 0) {
        var bright = 150 + _lightningTimer * 45;
        i = _lightningPos - (_lightningWidth + 1);
        if (i < 0) { i = 0; }
        while (i <= _lightningPos + _lightningWidth + 1 && i < count) {
            var dist = abs(i - _lightningPos);
            var falloff = 255 - (dist * 180 / (_lightningWidth + 1));
            if (falloff < 0) { falloff = 0; }
            var v = (bright * falloff) / 255;
            if (v > 255) { v = 255; }
            led(i, v, v, clamp((v * 220) / 255, 0, 255));
            i = i + 1;
        }
        _lightningTimer = _lightningTimer - 1;
    }
}