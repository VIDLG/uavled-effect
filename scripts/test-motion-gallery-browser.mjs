import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:5173";
const catalog = JSON.parse(await readFile("assets/effects/generated-motion-gallery/index.json", "utf8"));
await mkdir("tmp/motion-gallery", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = { base, effects: [], consoleErrors: [], failedRequests: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  const videos = new Set();
  page.on("pageerror", (error) => results.consoleErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") results.consoleErrors.push(message.text()); });
  page.on("response", (response) => {
    if (response.url().includes("generated-motion-gallery") && response.status() >= 400) results.failedRequests.push({ url: response.url(), status: response.status() });
  });
  // Vite also serves tiny JS URL modules named *.mp4?import; those aren't media downloads.
  page.on("request", (request) => { if (request.resourceType() === "media" && request.url().includes("-loop")) videos.add(request.url()); });
  await page.goto(`${base}/?view=motion`);
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v?.readyState >= 2 && !v.paused && v.currentTime > .1; });
  assert.equal(videos.size, 1, "Only the selected MP4 should load initially");
  results.initialVideoRequests = [...videos];
  for (const { label } of catalog.effects) {
    await page.getByRole("button", { name: `选择${label}动效`, exact: true }).click();
    await page.waitForFunction((label) => {
      const v = document.querySelector("video");
      return v?.getAttribute("aria-label") === `${label}循环动效` && v.readyState >= 2 && !v.paused && v.currentTime > .05;
    }, label);
    assert.equal(await page.locator("video").count(), 1, "Switching must leave only one decoder element");
    const media = await page.locator("video").evaluate(async (v) => {
      const start = v.currentTime;
      let callbacks = 0;
      let stopped = false;
      const onFrame = () => { callbacks++; if (!stopped) v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
      const t0 = performance.now();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      stopped = true;
      return { start, end: v.currentTime, duration: v.duration, source: v.currentSrc, width: v.videoWidth, height: v.videoHeight,
        muted: v.muted, loop: v.loop, callbacks, observedFps: callbacks / ((performance.now()-t0)/1000) };
    });
    assert(media.end > media.start + .8, `${label} should advance at normal speed`);
    assert(media.callbacks > 12, `${label} should produce actual decoded video frames`);
    assert.equal(media.width, 768);
    assert.equal(media.height, 512);
    assert(media.muted && media.loop);
    const definition = catalog.effects.find((effect) => effect.label === label);
    if (definition.revision) assert.equal(new URL(media.source).searchParams.get("v"), definition.revision, "The player must use the current background revision");
    await page.getByRole("button", { name: "暂停动效", exact: true }).click();
    const frozen = await page.locator("video").evaluate((v) => v.currentTime);
    await page.waitForTimeout(300);
    assert(Math.abs(await page.locator("video").evaluate((v) => v.currentTime)-frozen) < .06);
    await page.getByRole("button", { name: `跳转至${label}第4个关键画面`, exact: true }).click();
    await page.waitForFunction((time) => Math.abs(document.querySelector('video').currentTime-time)<.08, definition.keyframes[3].time);
    // Exercise the native loop boundary without waiting through all five clips.
    await page.locator("video").evaluate((v) => { v.currentTime = v.duration-.25; });
    await page.getByRole("button", { name: "播放动效", exact: true }).click();
    await page.waitForFunction(() => { const v = document.querySelector("video"); return !v.paused && v.currentTime < 1; });
    results.effects.push({ label, ...media, loopBoundaryPassed: true, pauseAndSeekPassed: true });
    if (definition.revision) await page.screenshot({ path: `tmp/motion-gallery/${definition.id}-background.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "选择森林动效", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("video")?.currentTime > .2);
  await page.getByRole("button", { name: "暂停动效", exact: true }).click();
  await page.screenshot({ path: "tmp/motion-gallery/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "下一种动效", exact: true }).click();
  await page.getByRole("heading", { name: "海洋", exact: true }).waitFor();
  await page.getByRole("button", { name: "上一种动效", exact: true }).click();
  await page.getByRole("heading", { name: "森林", exact: true }).waitFor();
  await page.getByRole("button", { name: "特效库", exact: true }).click();
  assert.equal(await page.locator("video").count(), 0, "Leaving the gallery must release its video");

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const phone = await mobile.newPage();
  await phone.goto(`${base}/?view=motion`);
  await phone.waitForFunction(() => document.querySelector("video")?.currentTime > .1);
  await phone.getByRole("button", { name: "选择海洋动效", exact: true }).click();
  await phone.waitForFunction(() => document.querySelector("video")?.getAttribute("aria-label") === "海洋循环动效" && document.querySelector("video").currentTime > .1);
  const widths = await phone.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(widths.body <= widths.viewport, "Mobile page must not overflow horizontally");
  results.mobile = widths;
  await phone.getByRole("button", { name: "暂停动效", exact: true }).click();
  await phone.screenshot({ path: "tmp/motion-gallery/mobile.png", fullPage: true });

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const quiet = await reduced.newPage();
  await quiet.goto(`${base}/?view=motion`);
  await quiet.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
  assert(await quiet.locator("video").evaluate((v) => v.paused));
  await quiet.getByRole("button", { name: "播放动效", exact: true }).click();
  await quiet.waitForFunction(() => document.querySelector("video")?.currentTime > .1);
  results.reducedMotionManualPlay = true;
  assert.deepEqual(results.consoleErrors, []);
  assert.deepEqual(results.failedRequests, []);
  await writeFile("tmp/motion-gallery/browser-verification.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
