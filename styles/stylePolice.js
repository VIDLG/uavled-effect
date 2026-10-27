

// --- Police (alternating red/blue flash) ---
// 中文：警灯风格，左右红蓝交替爆闪
function stylePolice() {
    var count = getLedCount();
    var half = count / 2;
    var fast = (_frame / 4) % 6;
    var leftOn = fast < 3;
    var i = 0;
    while (i < count) {
        if (i < half) {
            if (leftOn) { led(i, 255, 0, 0); } else { led(i, 0, 0, 0); }
        } else {
            if (leftOn) { led(i, 0, 0, 0); } else { led(i, 0, 0, 255); }
        }
        i = i + 1;
    }
}