

// Fill all LEDs with one color (brightness/power applied)
function fill(r, g, b) {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        led(i, r, g, b);
        i = i + 1;
    }
}