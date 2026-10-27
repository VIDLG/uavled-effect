

// --- Forest (green tones twinkling) ---
// 中文：森林风格，深浅绿色中夹杂萤火虫闪点
function styleForest() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var canopy = (sin255((_frame * 3 + i * 32) % 256) + 255) / 2;
        var understory = (sin255((_frame * 2 + i * 19 + 80) % 256) + 255) / 2;
        var rr = 8 + (understory * 28) / 255;
        var gg = 55 + (canopy * 170) / 255;
        var bb = 10 + (understory * 45) / 255;
        if (((_frame + i * 9) % 47) == 0) {
            rr = 200;
            gg = 255;
            bb = 100;
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}