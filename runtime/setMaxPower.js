

// Set max RGB total per LED (power management)
// e.g. setMaxPower(255) means r+g+b <= 255
function setMaxPower(max) {
    if (max < 0) { max = 0; }
    if (max > 765) { max = 765; }
    _maxPower = max;
}