

// ============================================================
// Timing Utilities (frame-based, ~60fps)
// ============================================================

// Global frame counter (auto-incremented by tick())
var _frame = 0;

// Call this at the start of update() to auto-increment frame counter
function tick() {
    _frame = _frame + 1;
    return _frame;
}