

// --- Heartbeat (double pulse like a heart) ---
// 中文：心跳风格，双击式明暗脉冲
function styleHeartbeat(r, g, b) {
    var period = 90;
    var pos = _frame % period;
    var bright = 0;
    // First beat at 0-15
    if (pos < 8) { bright = pos * 32; }
    else if (pos < 16) { bright = (16 - pos) * 32; }
    // Second beat at 20-35
    else if (pos >= 20 && pos < 28) { bright = (pos - 20) * 32; }
    else if (pos >= 28 && pos < 36) { bright = (36 - pos) * 32; }
    if (bright > 255) { bright = 255; }
    if (bright < 0) { bright = 0; }
    fill((r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
}