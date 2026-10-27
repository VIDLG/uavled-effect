import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  publicDir: resolve(root, "public"),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: "react-native-web" },
      { find: /^react-native\/Libraries\/ReactNative\/ReactFabricPublicInstance\/ReactFabricPublicInstance$/, replacement: resolve(root, "src/web-native-stub.js") },
      { find: /^react-native\/Libraries\/Renderer\/shims\/ReactFabric$/, replacement: resolve(root, "src/web-native-stub.js") },
    ],
    extensions: [".web.mjs", ".mjs", ".web.js", ".js", ".web.ts", ".ts", ".web.tsx", ".tsx", ".json"],
  },
  define: { global: "globalThis", __DEV__: false },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: [".web.js", ".js", ".web.mjs", ".mjs", ".web.ts", ".ts", ".web.tsx", ".tsx", ".json"],
    },
  },
  server: {
    fs: { allow: [resolve(root, "..")] },
  },
  build: {
    outDir: resolve(root, "../simulator-build"),
    emptyOutDir: true,
  },
});
