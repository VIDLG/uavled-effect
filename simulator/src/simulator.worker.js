import prelude from "../../dist/prelude.js?raw";
import { simulateFrames } from "./simulate.js";

self.onmessage = ({ data }) => {
  try {
    const snapshots = simulateFrames(prelude, data.call);
    self.postMessage({ id: data.id, snapshots });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
  }
};
