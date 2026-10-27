import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("MCP exposes independently callable compiler and simulator tools", async () => {
  const child = spawn(process.execPath, ["tools/mcp-server.mjs"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let buffer = "";
  let nextId = 0;
  let stderr = "";
  const name = `mcp-test-${process.pid}`;
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let end = buffer.indexOf("\n");
    while (end >= 0) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (line) {
        const message = JSON.parse(line);
        if (pending.has(message.id)) {
          pending.get(message.id)(message);
          pending.delete(message.id);
        }
      }
      end = buffer.indexOf("\n");
    }
  });
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => reject(new Error(`MCP timeout: ${method}: ${stderr}`)), 8000);
    pending.set(id, (message) => { clearTimeout(timer); resolve(message); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });

  try {
    const initialized = await request("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "uavled-test", version: "1" } });
    assert(initialized.result, JSON.stringify(initialized));
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
    const listed = await request("tools/list");
    assert.deepEqual(listed.result.tools.map((tool) => tool.name).sort(), ["compile_effect", "simulate_effect"]);
    const compiled = await request("tools/call", { name: "compile_effect", arguments: { code: "function update(): void { tick(); effectChase(255, 90, 20, 4); }", name } });
    assert.equal(JSON.parse(compiled.result.content[0].text).artifact, `compiled/${name}.js`);
    const simulated = await request("tools/call", { name: "simulate_effect", arguments: { artifact: `compiled/${name}.js`, frames: 8 } });
    assert.equal(JSON.parse(simulated.result.content[0].text).frames, 8);
  } finally {
    child.stdin.end();
    child.kill();
    await Promise.all([
      rm(resolve(`compiled/${name}.js`), { force: true }),
      rm(resolve(`simulations/${name}.json`), { force: true }),
    ]);
  }
});
