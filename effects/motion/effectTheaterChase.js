

// --- Theater chase (alternating groups shift) ---
// 中文：剧院追逐灯，按组交替亮灭并整体平移
function effectTheaterChase(r, g, b, groupSize) {
    var count = getLedCount();
    groupSize = _atLeastOne(groupSize);
    var shift = (_frame / 4) % groupSize;
    var i = 0;
    while (i < count) {
        if ((i + shift) % (groupSize * 2) < groupSize) {
            led(i, r, g, b);
        } else {
            led(i, 0, 0, 0);
        }
        i = i + 1;
    }
}