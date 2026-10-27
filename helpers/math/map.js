

// Map value from [inLo,inHi] to [outLo,outHi]
function map(v, inLo, inHi, outLo, outHi) {
    return outLo + ((v - inLo) * (outHi - outLo)) / (inHi - inLo);
}