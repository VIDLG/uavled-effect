

// Global breathing envelope for calm, atmospheric, or idle scenes.
function effectBreathe(r, g, b, speed) {
    speed = _atLeastOne(speed);
    var phase = _positiveMod(_frame * speed * 3, 256);
    var bright = 28 + ((sin255(phase) + 255) * 227) / 510;
    fill((r * bright) / 255, (g * bright) / 255, (b * bright) / 255);
}