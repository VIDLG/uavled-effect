

// Breathe/pulse effect — fade in and out
// period: total frames for one full cycle
// Returns brightness 0-255
function breathe(period) {
    period = _atLeastOne(period);
    var half = period / 2;
    if (half < 1) { half = 1; }
    var pos = _frame % period;
    if (pos < half) {
        return (pos * 255) / half;
    }
    return ((period - pos) * 255) / half;
}