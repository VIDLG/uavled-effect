import prelude from "../../dist/prelude.js?raw";
import { simulateCompiledFrames } from "./simulate.js";

self.onmessage = ({ data }) => {
  try {
    const snapshots = simulateCompiledFrames(prelude, data.code);
    self.postMessage({ action: "simulate", id: data.id, snapshots });
  } catch (error) {
    self.postMessage({ action: "simulate", id: data.id, error: error instanceof Error ? error.message : String(error) });
  }
};
