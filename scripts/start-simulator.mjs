import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const noOpen = process.argv.includes("--no-open");

function startNpm(args, stdio) {
  const options = { cwd: root, stdio };
  if (process.platform === "win32") {
    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], options);
  }
  return spawn("npm", args, options);
}

async function installDependencies() {
  if (existsSync(resolve(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite"))) return;
  console.log("Installing simulator dependencies...");
  const installer = startNpm(["install"], "inherit");
  const code = await new Promise((resolveExit, reject) => {
    installer.once("error", reject);
    installer.once("exit", resolveExit);
  });
  if (code !== 0) throw new Error(`npm install exited with code ${code}`);
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Vite can print the address before its HTTP listener accepts connections.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Simulator did not become ready at ${url}`);
}

function openBrowser(url) {
  if (noOpen) return;
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/d", "/s", "/c", `start "" "${url}"`], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } else {
    spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}

try {
  await installDependencies();
  const server = startNpm(["run", "sim:dev", "--", "--host", "127.0.0.1", "--port", "5174"], ["inherit", "pipe", "inherit"]);
  let output = "";
  let opening = false;
  server.stdout.on("data", (chunk) => {
    const value = chunk.toString();
    process.stdout.write(value);
    output = (output + value).slice(-2048);
    const match = output.match(/Local:\s*(http:\/\/127\.0\.0\.1:\d+\/)/);
    if (match && !opening) {
      opening = true;
      waitForServer(match[1]).then(() => {
        console.log(`Simulator ready: ${match[1]}`);
        openBrowser(match[1]);
      }).catch((error) => console.error(error));
    }
  });
  const code = await new Promise((resolveExit, reject) => {
    server.once("error", reject);
    server.once("exit", resolveExit);
  });
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
