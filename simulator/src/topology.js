const DRONE_ASPECT = 1776 / 1529;

function distance(left, right) {
  return Math.hypot(right[0] - left[0], right[1] - left[1]);
}

function pointOnPath(path, progress) {
  const lengths = path.slice(1).map((point, index) => distance(path[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const target = total * progress;
  let walked = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (walked + lengths[index] >= target) {
      const ratio = lengths[index] ? (target - walked) / lengths[index] : 0;
      return [
        path[index][0] + (path[index + 1][0] - path[index][0]) * ratio,
        path[index][1] + (path[index + 1][1] - path[index][1]) * ratio,
      ];
    }
    walked += lengths[index];
  }
  return path.at(-1);
}

export function buildTopology(profile, width, height) {
  const droneWidth = Math.min(width * (width < 640 ? 0.73 : 0.57), height * 0.93 * DRONE_ASPECT);
  const droneHeight = droneWidth / DRONE_ASPECT;
  const box = { x: (width - droneWidth) / 2, y: height * 0.52 - droneHeight / 2, width: droneWidth, height: droneHeight };
  const regions = profile.lighting.topology_profile.regions;
  const wing = (side) => regions
    .filter((region) => region.id.startsWith(`${side}_`))
    .flatMap((region) => {
      const count = region.logical_end - region.logical_start;
      return Array.from({ length: count }, (_, offset) => {
        const [x, y] = pointOnPath(region.path, count < 2 ? 0 : offset / (count - 1));
        return {
          index: region.logical_start + offset,
          x: box.x + box.width * x / 100,
          y: box.y + box.height * y / 100,
        };
      });
    });
  return { box, left: wing("left"), right: wing("right") };
}
