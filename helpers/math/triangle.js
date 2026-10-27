

// Triangle wave 0-255 (period in frames)
function triangle(period) {
    period = _atLeastOne(period);
    var pos = _frame % period;
    var half = period / 2;
    if (half < 1) { half = 1; }
    if (pos < half) {
        return (pos * 255) / half;
    }
    return ((period - pos) * 255) / half;
}