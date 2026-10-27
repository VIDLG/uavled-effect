

// ============================================================
// Style Effects (themed presets)
// ============================================================

// --- Cyberpunk (neon pink/cyan glitch) ---
// 中文：赛博朋克风，霓虹粉青交替并偶发故障闪白
var _cyberpunkGlitchTimer = 0;
var _cyberpunkGlitchPos = 0;
var _cyberpunkGlitchWidth = 0;

function styleCyberpunk() {
    var count = getLedCount();
    if (_cyberpunkGlitchTimer > 0) {
        _cyberpunkGlitchTimer = _cyberpunkGlitchTimer - 1;
    } else if (random(100) < 6) {
        _cyberpunkGlitchTimer = 1 + random(2);
        _cyberpunkGlitchPos = random(count);
        _cyberpunkGlitchWidth = 1 + random(3);
    }
    var i = 0;
    while (i < count) {
        var base = 150 + ((sin255((_frame * 5 + i * 21) % 256) + 255) * 55) / 255;
        var phase = (_frame * 4 + i * 42) % 512;
        var rr = 0; var gg = 0; var bb = 0;
        if (phase < 256) {
            rr = 170 + (base * 85) / 255;
            gg = 20 + (base * 35) / 255;
            bb = 80 + (base * 120) / 255;
        } else {
            rr = 20 + (base * 40) / 255;
            gg = 150 + (base * 90) / 255;
            bb = 160 + (base * 95) / 255;
        }
        if (_cyberpunkGlitchTimer > 0) {
            var dist = abs(i - _cyberpunkGlitchPos);
            if (dist <= _cyberpunkGlitchWidth) {
                var glitch = 255 - (dist * 140 / (_cyberpunkGlitchWidth + 1));
                rr = clamp(rr + glitch / 4, 0, 255);
                gg = clamp(gg + glitch / 8, 0, 255);
                bb = clamp(bb + glitch / 3, 0, 255);
            } else if (((_frame + i) % 5) == 0) {
                rr = (rr * 180) / 255;
                gg = (gg * 140) / 255;
                bb = (bb * 200) / 255;
            }
        }
        led(i, rr, gg, bb);
        i = i + 1;
    }
}