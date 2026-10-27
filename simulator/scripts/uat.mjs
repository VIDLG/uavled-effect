import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve(process.argv[2] ?? "simulator-evidence");
const url = process.argv[3] ?? "http://127.0.0.1:5174/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];

async function createPage(viewport, recordVideo = false, libraryScreenshot = false) {
  const context = await browser.newContext({ viewport, ...(recordVideo ? { recordVideo: { dir: output, size: viewport } } : {}) });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(url);
  await page.getByRole("button", { name: "进入模拟器" }).waitFor();
  if (libraryScreenshot) await page.screenshot({ path: resolve(output, "library-desktop.png") });
  await page.getByRole("button", { name: "进入模拟器" }).click();
  await page.locator(".drone-stage canvas").waitFor();
  await page.getByText("模拟就绪").waitFor();
  assert(await page.locator(".drone-image").evaluate((image) => image.naturalWidth > 0));
  return { page, context };
}

async function seek(page, frame) {
  await page.getByRole("slider", { name: "模拟帧" }).evaluate((input, index) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, String(index));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

try {
  const chase = await createPage({ width: 1280, height: 720 }, true, true);
  await chase.page.getByRole("button", { name: "暂停" }).click();
  await chase.page.locator(".calibration-toggle").click();
  await chase.page.waitForTimeout(120);
  await chase.page.screenshot({ path: resolve(output, "calibration-desktop.png") });
  await chase.page.locator(".calibration-toggle").click();
  for (const index of [0, 40, 80, 120]) {
    await seek(chase.page, index);
    await chase.page.waitForTimeout(120);
    await chase.page.screenshot({ path: resolve(output, `chase-${index}.png`) });
  }
  await chase.page.getByRole("button", { name: "回到起点" }).click();
  await chase.page.getByRole("button", { name: "播放" }).click();
  await chase.page.waitForTimeout(2400);
  const chaseFrame = Number(await chase.page.getByRole("slider", { name: "模拟帧" }).inputValue());
  assert(chaseFrame >= 30, `chase playback advanced only ${chaseFrame} frames in 2.4 seconds`);
  const chaseVideo = chase.page.video();
  await chase.context.close();
  await chaseVideo.saveAs(resolve(output, "chase-playback.webm"));

  const meteor = await createPage({ width: 1280, height: 720 }, true);
  await meteor.page.locator(".script-row").filter({ hasText: "流星" }).first().click();
  await meteor.page.getByText("模拟就绪").waitFor();
  await meteor.page.waitForTimeout(1600);
  await meteor.page.getByRole("button", { name: "暂停" }).click();
  await meteor.page.screenshot({ path: resolve(output, "meteor-paused.png") });
  await meteor.page.getByRole("button", { name: "播放" }).click();
  await meteor.page.waitForTimeout(2200);
  const meteorVideo = meteor.page.video();
  await meteor.context.close();
  await meteorVideo.saveAs(resolve(output, "meteor-playback.webm"));

  const mobile = await createPage({ width: 390, height: 844 });
  await mobile.page.getByRole("button", { name: "暂停" }).click();
  await mobile.page.locator(".calibration-toggle").click();
  await mobile.page.waitForTimeout(120);
  await mobile.page.screenshot({ path: resolve(output, "calibration-mobile.png"), fullPage: true });
  const dimensions = await mobile.page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(dimensions.content <= dimensions.viewport + 1, `mobile horizontal overflow: ${JSON.stringify(dimensions)}`);
  await mobile.context.close();

  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ output, scripts: ["effectChase", "effectMeteor"], frames: [0, 40, 80, 120], chaseFrameAfter2400ms: chaseFrame, mobile: "390x844", errors }, null, 2));
} finally {
  await browser.close();
}
