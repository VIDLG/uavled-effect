import { compileProjectEffect, simulateCompiledEffect } from "./effect-tools.mjs";

function options(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!key?.startsWith("--") || !args[index + 1]) throw new Error(`参数格式错误：${key ?? ""}`);
    result[key.slice(2)] = args[index + 1];
  }
  return result;
}

try {
  const [tool, ...args] = process.argv.slice(2);
  const input = options(args);
  const result = tool === "compile"
    ? await compileProjectEffect(input)
    : tool === "simulate"
      ? await simulateCompiledEffect({ artifact: input.artifact, frames: input.frames === undefined ? undefined : Number(input.frames) })
      : (() => { throw new Error("使用 compile 或 simulate 工具"); })();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
