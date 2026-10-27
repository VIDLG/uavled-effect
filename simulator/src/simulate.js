export const LED_COUNT = 40;
export const FRAME_COUNT = 240;
export const FRAME_RATE = 30;

function channel(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.trunc(value)));
}

export function simulateFrames(prelude, call, frames = FRAME_COUNT, ledCount = LED_COUNT) {
  return simulateCompiledFrames(prelude, `function update() { tick(); ${call}; }`, frames, ledCount);
}

export function simulateCompiledFrames(prelude, compiledCode, frames = FRAME_COUNT, ledCount = LED_COUNT) {
  const leds = Array.from({ length: ledCount }, () => [0, 0, 0]);
  const setLed = (index, r, g, b) => {
    if (!Number.isInteger(index) || index < 0 || index >= ledCount) return;
    leds[index] = [channel(r), channel(g), channel(b)];
  };
  const setAll = (r, g, b) => {
    const color = [channel(r), channel(g), channel(b)];
    for (let index = 0; index < ledCount; index += 1) leds[index] = [...color];
  };
  const getLedCount = () => ledCount;
  const update = new Function(
    "setLed", "setAll", "getLedCount",
    `${prelude}\n${compiledCode}\nreturn update;`,
  )(setLed, setAll, getLedCount);
  const snapshots = [];
  for (let frame = 0; frame < frames; frame += 1) {
    update();
    snapshots.push(leds.map((led) => [...led]));
  }
  return snapshots;
}
