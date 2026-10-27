

// Rainbow cycle across all LEDs
// speed: color shift per frame
// 中文：整条灯带按彩虹色循环滚动
function effectRainbow(speed) {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var pos = _frame * speed + i * (768 / count);
        led(i, wheelRgbR(pos), wheelRgbG(pos), wheelRgbB(pos));
        i = i + 1;
    }
}