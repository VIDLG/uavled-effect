

function _phasePosition(speed, span) {
    speed = _atLeastOne(speed);
    span = _atLeastOne(span);
    return _positiveMod(_frame, span * speed) / speed;
}