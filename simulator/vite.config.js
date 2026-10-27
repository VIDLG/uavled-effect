import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = dirname(fileURLToPath(import.meta.url));
const libraryRoot = resolve(root, "..");

function watchEffectFiles() {
  return {
    name: "watch-effect-files",
    configureServer(server) {
      const folders = [resolve(libraryRoot, "project-scripts"), resolve(libraryRoot, "compiled")];
      server.watcher.add(folders);
      const refresh = (file) => {
        if (!folders.some((folder) => file.startsWith(`${folder}\\`) || file.startsWith(`${folder}/`))) return;
        const catalog = server.moduleGraph.getModuleById(resolve(root, "src/catalog.js"));
        if (catalog) server.moduleGraph.invalidateModule(catalog);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
    },
  };
}

export default defineConfig({
  root,
  publicDir: resolve(root, "public"),
  plugins: [react(), watchEffectFiles()],
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
    include: ["typescript"],
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
