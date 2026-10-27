

// One-shot fade. Positive direction fades in; negative direction fades out.
function effectFade(r, g, b, duration, direction) {
    duration = _atLeastOne(duration);
    var progress = clamp(_frame / duration, 0, 1);
    if (direction < 0) { progress = 1 - progress; }
    fill(r * progress, g * progress, b * progress);
}