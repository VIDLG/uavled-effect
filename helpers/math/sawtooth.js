

// Sawtooth wave 0-255 (period in frames)
function sawtooth(period) {
    period = _atLeastOne(period);
    return (_frame % period) * 255 / period;
}