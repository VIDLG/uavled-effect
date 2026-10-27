// ledjs standard library (prelude)
// Auto-included when using `ledjs push --lib` or `ledjs run --lib`
// All functions use integer math only (mquickjs has no floats)

// ============================================================
// Power & Brightness
// ============================================================

// Global brightness (0-255), applied by led() wrapper
var _brightness = 255;

// Max total RGB per LED (power limit, default 255)
var _maxPower = 255;

// Composition scope. The default 0..100 range preserves legacy behavior.
var _effectZoneStart = 0;
var _effectZoneEnd = 100;
var _effectBlendMode = 0;
var _effectBlendOpacity = 100;
var _effectCompositionActive = 0;
var _effectCompositionR = [];
var _effectCompositionG = [];
var _effectCompositionB = [];
