import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const target = resolve(root, "simulator/public/canvaskit.wasm");
await mkdir(dirname(target), { recursive: true });
await copyFile(resolve(root, "node_modules/canvaskit-wasm/bin/full/canvaskit.wasm"), target);
