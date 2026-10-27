

// Alternating pattern — split LEDs into groups
// groupSize: how many LEDs per group
// Returns 0 or 1 for group index at position i
function alternate(i, groupSize) {
    groupSize = _atLeastOne(groupSize);
    return ((i / groupSize) % 2);
}