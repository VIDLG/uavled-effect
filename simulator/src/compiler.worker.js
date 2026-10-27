import { compileEffect } from "./effectCompiler.js";

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ action: "compile", id: data.id, code: compileEffect(data.code) });
  } catch (error) {
    self.postMessage({ action: "compile", id: data.id, error: error instanceof Error ? error.message : String(error) });
  }
};
