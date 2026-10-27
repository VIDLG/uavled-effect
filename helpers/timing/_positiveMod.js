

function _positiveMod(value, divisor) {
    if (divisor < 1) { return 0; }
    var result = value % divisor;
    if (result < 0) { result = result + divisor; }
    return result;
}