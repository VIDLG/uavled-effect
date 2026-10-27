import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve(process.argv[2] ?? "simulator-evidence");
const url = process.argv[3] ?? "http://127.0.0.1:5174/";
const checkHmr = process.argv.includes("--hmr");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];

async function pageAt(viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(url);
  await page.getByRole("button", { name: "进入编译器" }).waitFor();
  return page;
}

try {
  const desktop = await pageAt({ width: 1280, height: 800 });
  await desktop.getByRole("button", { name: "进入模拟器" }).click();
  await desktop.locator(".script-row").filter({ hasText: "compiled/wing-chase.js" }).click();
  await desktop.getByText("模拟就绪").waitFor();
  await desktop.getByRole("button", { name: "暂停" }).click();
  await desktop.screenshot({ path: resolve(output, "compiled-file-simulation.png") });
  const firstCanvas = await desktop.locator(".drone-stage canvas").screenshot();
  await desktop.getByRole("slider", { name: "模拟帧" }).evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "80");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await desktop.waitForTimeout(120);
  const laterCanvas = await desktop.locator(".drone-stage canvas").screenshot();
  assert(!firstCanvas.equals(laterCanvas), "compiled script canvas did not change between frames 0 and 80");
  await desktop.screenshot({ path: resolve(output, "compiled-file-frame80.png") });
  await desktop.getByRole("button", { name: "编译器" }).click();
  assert.match(await desktop.getByRole("textbox", { name: "特效脚本代码" }).inputValue(), /function update/);
  await desktop.screenshot({ path: resolve(output, "compiler-source-desktop.png") });
  await desktop.getByRole("button", { name: "编译脚本" }).click();
  await Promise.race([desktop.getByText("编译完成").waitFor(), desktop.getByRole("alert").waitFor()]);
  assert.equal(await desktop.getByRole("alert").count(), 0, `compile failed: ${await desktop.getByRole("alert").allInnerTexts()} ${errors.join(" | ")}`);
  assert.match(await desktop.locator(".compiled-code").innerText(), /function update\(\)/);
  await desktop.screenshot({ path: resolve(output, "compiler-result-desktop.png") });
  await desktop.getByRole("button", { name: "送入模拟器" }).click();
  await desktop.getByText("模拟就绪").waitFor();
  await desktop.getByRole("button", { name: "暂停" }).click();
  assert.equal(await desktop.locator(".drone-stage canvas").count(), 1);
  await desktop.screenshot({ path: resolve(output, "compiled-project-simulation.png") });

  await desktop.getByRole("button", { name: "编译器" }).click();
  await desktop.getByRole("button", { name: "新建脚本" }).click();
  await desktop.getByRole("textbox", { name: "特效脚本代码" }).fill("function update(): void { tick(); led(0, 255, 0, 0); }");
  await desktop.getByRole("button", { name: "编译脚本" }).click();
  await desktop.getByText("编译完成").waitFor();
  await desktop.getByRole("button", { name: "送入模拟器" }).click();
  await desktop.getByText("模拟就绪").waitFor();
  await desktop.getByRole("button", { name: "暂停" }).click();
  await desktop.screenshot({ path: resolve(output, "inline-script-simulation.png") });

  await desktop.getByRole("button", { name: "编译器" }).click();
  await desktop.locator(".file-import input").setInputFiles({ name: "imported.ts", mimeType: "text/plain", buffer: Buffer.from("function update(): void { tick(); led(0, 0, 255, 0); }") });
  await desktop.waitForFunction(() => document.querySelector(".code-editor")?.value.includes("led(0, 0, 255, 0)"));
  assert.match(await desktop.getByRole("textbox", { name: "特效脚本代码" }).inputValue(), /led\(0, 0, 255, 0\)/);
  await desktop.getByRole("button", { name: "编译脚本" }).click();
  await desktop.getByText("编译完成").waitFor();
  await desktop.getByRole("textbox", { name: "特效脚本代码" }).fill("function update(: void {}");
  await desktop.getByRole("button", { name: "编译脚本" }).click();
  await desktop.getByRole("alert").waitFor();
  assert.match(await desktop.getByRole("alert").innerText(), /\d+:\d+|expected/i);

  await desktop.getByRole("button", { name: "新建脚本" }).click();
  await desktop.getByRole("textbox", { name: "特效脚本代码" }).fill("function update() { while (true) {} }");
  await desktop.getByRole("button", { name: "编译脚本" }).click();
  await desktop.getByText("编译完成").waitFor();
  await desktop.getByRole("button", { name: "送入模拟器" }).click();
  await desktop.getByRole("alert").getByText("脚本运行超过 6 秒，模拟已停止").waitFor({ timeout: 10000 });

  if (checkHmr) {
    const name = `uat-added-${process.pid}`;
    const path = resolve(`project-scripts/${name}.ts`);
    const compiledPath = resolve(`compiled/${name}.js`);
    try {
      await writeFile(path, "function update(): void { tick(); led(0, 255, 0, 0); }\n", "utf8");
      await desktop.reload();
      await desktop.getByRole("button", { name: "进入编译器" }).click();
      await desktop.locator(".compiler-file").filter({ hasText: name }).waitFor();
      await writeFile(compiledPath, "function update() { tick(); led(0, 255, 0, 0); }\n", "utf8");
      await desktop.reload();
      await desktop.getByRole("button", { name: "进入模拟器" }).click();
      await desktop.locator(".script-row").filter({ hasText: `compiled/${name}.js` }).click();
      await desktop.getByText("模拟就绪").waitFor();
    } finally {
      await Promise.all([rm(path, { force: true }), rm(compiledPath, { force: true })]);
    }
  }
  await desktop.close();

  const mobile = await pageAt({ width: 390, height: 844 });
  await mobile.screenshot({ path: resolve(output, "library-mobile.png") });
  await mobile.getByRole("button", { name: "进入编译器" }).click();
  await mobile.screenshot({ path: resolve(output, "compiler-mobile.png"), fullPage: true });
  const dimensions = await mobile.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(dimensions.content <= dimensions.viewport + 1, `mobile horizontal overflow: ${JSON.stringify(dimensions)}`);
  await mobile.close();

  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ output, workflows: ["compiled-file", "project-file", "inline-code", "imported-file", "compile-error", "script-timeout", ...(checkHmr ? ["new-project-file", "new-compiled-file"] : [])], mobile: dimensions, errors }, null, 2));
} finally {
  await browser.close();
}
