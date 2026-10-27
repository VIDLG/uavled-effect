

function _circularDistance(a, b, count) {
    var dist = abs(a - b);
    if (dist > count / 2) {
        dist = count - dist;
    }
    return dist;
}