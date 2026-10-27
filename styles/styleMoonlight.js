

// --- Moonlight (cool blue shimmer) ---
function styleMoonlight() {
    var count = getLedCount();
    var i = 0;
    while (i < count) {
        var mist = (sin255((_frame * 2 + i * 24) % 256) + 255) / 2;
        var shimmer = (sin255((_frame * 4 + i * 53 + 80) % 256) + 255) / 2;
        var rr = 6 + (mist * 18) / 255;
        var gg = 24 + ((mist + shimmer) * 50) / 510;
        var bb = 90 + (mist * 110) / 255;
        if (shimmer > 220) {
            rr = clamp(rr + 16, 0, 255);
            gg = clamp(gg + 18, 0, 255);
            bb = clamp(bb + 24, 0, 255);
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}