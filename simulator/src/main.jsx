import React from "react";
import { createRoot } from "react-dom/client";
import { LoadSkiaWeb } from "react-native-skia/lib/module/web";

LoadSkiaWeb({ locateFile: () => "/canvaskit.wasm" }).then(async () => {
  const { default: App } = await import("./App.jsx");
  createRoot(document.getElementById("root")).render(<App />);
}).catch((error) => {
  const boot = document.querySelector(".boot span:last-child");
  if (boot) boot.textContent = `模拟器载入失败：${error.message}`;
});
