import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { compileProjectEffect, simulateCompiledEffect } from "./effect-tools.mjs";

function response(operation) {
  return operation.then((result) => ({ content: [{ type: "text", text: JSON.stringify(result) }] }))
    .catch((error) => ({ isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] }));
}

function createServer() {
  const server = new McpServer({ name: "uavled-effects", version: "0.1.0" });
  server.registerTool("compile_effect", {
    description: "Compile one project-scripts .ts/.js file or inline UAVLED update() script into compiled/<name>.js. Supply exactly one of file or code.",
    inputSchema: z.object({ file: z.string().optional(), code: z.string().optional(), name: z.string().optional() }),
  }, (input) => response(compileProjectEffect(input)));
  server.registerTool("simulate_effect", {
    description: "Run a compiled/<name>.js artifact on 40 logical LEDs, save frame snapshots in simulations/, and return a compact summary.",
    inputSchema: z.object({ artifact: z.string(), frames: z.number().int().min(1).max(240).optional() }),
  }, (input) => response(simulateCompiledEffect(input)));
  return server;
}

void serveStdio(createServer);
