import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, Circle } from "react-native-skia";
import profile from "./hardware-profile.json";
import { buildTopology } from "./topology.js";

function channel(value) {
  return Math.min(255, Math.round(value + (255 - value) * 0.16));
}

function Led({ point, raw, calibration }) {
  const [r, g, b] = calibration ? [40, 210, 190] : raw ?? [0, 0, 0];
  const lit = calibration || Math.max(r, g, b) >= 28 || r + g + b >= 84;
  const color = lit ? [channel(r), channel(g), channel(b)] : [r, g, b];
  const [red, green, blue] = color;
  return <>
    {lit && <Circle cx={point.x} cy={point.y} r={11} color={`rgba(${red},${green},${blue},0.17)`} />}
    {lit && <Circle cx={point.x} cy={point.y} r={6.5} color={`rgba(${red},${green},${blue},0.34)`} />}
    <Circle cx={point.x} cy={point.y} r={4} color={lit ? `rgb(${red},${green},${blue})` : "#445055"} />
    <Circle cx={point.x} cy={point.y} r={1.35} color={lit ? "rgba(255,255,255,0.68)" : "#697276"} />
  </>;
}

export default function DroneCanvas({ frame, calibration }) {
  const stageRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const topology = useMemo(() => buildTopology(profile, size.width, size.height), [size.width, size.height]);

  return <div className="drone-stage" ref={stageRef} data-testid="drone-stage">
    <div className="stage-grid" aria-hidden="true" />
    {size.width > 0 && <>
      <img className="drone-image" src="/drone.png" alt="" draggable="false" style={{ left: topology.box.x, top: topology.box.y, width: topology.box.width, height: topology.box.height }} />
      <Canvas style={{ position: "absolute", inset: 0, width: size.width, height: size.height }}>
        {topology.left.map((point) => <Led key={`left-${point.index}`} point={point} raw={frame?.[point.index]} calibration={calibration} />)}
        {topology.right.map((point) => <Led key={`right-${point.index}`} point={point} raw={frame?.[point.index]} calibration={calibration} />)}
      </Canvas>
    </>}
    <span className="stage-corner stage-corner-top">TOP VIEW</span>
    <span className="stage-corner stage-corner-bottom">40 LOGICAL / 80 PHYSICAL</span>
  </div>;
}
