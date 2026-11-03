import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:5173";
const rules = JSON.parse(await readFile("assets/effects/single-image-motion/index.json", "utf8"));
await mkdir("tmp/single-image-motion", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { errors: [], imageUrls: {} };
const mediaRequests = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
  page.on("request", (request) => {
    if (request.resourceType() === "media") mediaRequests.push(request.url());
    if (request.resourceType() === "image") for (const name of ["base", "phase", "palette"])
      if (request.url().includes(`effectRainbow-${name}`)) report.imageUrls[name] = request.url();
  });
  await page.goto(`${base}/?view=motion&effect=effectRainbow`);
  await page.getByRole("button", { name: "播放动效", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.motion-artwork[aria-busy="false"] canvas'));
  assert.equal(await page.locator("video").count(), 0);
  const artwork = page.getByRole("img", { name: "彩虹循环常亮色带动效", exact: true });
  const before = await artwork.screenshot({ path: "tmp/single-image-motion/start.png" });
  await page.getByRole("button", { name: "播放动效", exact: true }).click();
  await page.waitForFunction(() => +document.querySelector('[aria-label="动效播放进度"]').value > .8);
  await page.getByRole("button", { name: "暂停动效", exact: true }).click();
  const after = await artwork.screenshot({ path: "tmp/single-image-motion/advanced.png" });
  assert(!before.equals(after), "Actual canvas colors must advance");
  const frozen = await artwork.screenshot();
  await page.waitForTimeout(250);
  assert(frozen.equals(await artwork.screenshot()), "Paused pixels must remain fixed");
  await page.getByRole("button", { name: "原图对照", exact: true }).click();
  assert(!(await artwork.screenshot()).equals(after));
  await page.getByRole("button", { name: "播放动效", exact: true }).click();
  await page.getByRole("button", { name: "暂停动效", exact: true }).click();
  const range = page.getByRole("slider", { name: "动效播放进度" });
  const box = await range.boundingBox();
  await range.click({ position: { x: box.width*.97, y: box.height/2 } });
  assert(+await range.inputValue() > 8, "Seeking should reach the end of the cycle");
  await page.getByRole("button", { name: "播放动效", exact: true }).click();
  await page.waitForFunction(() => +document.querySelector('[aria-label="动效播放进度"]').value < 1);
  await page.getByRole("button", { name: "暂停动效", exact: true }).click();
  report.pauseSeekAndLoop = true;
  report.singleImageMediaRequests = [...mediaRequests];
  assert.deepEqual(report.singleImageMediaRequests, [], "Single-image preview must not download an MP4");

  report.gpu = await page.evaluate(async ({ rules, urls }) => {
    const { createSingleImageRenderer, shadePixel, samplePalette, phaseAt } = await import('/src/singleImageMotion.js');
    const canvas = document.createElement("canvas");
    canvas.width = rules.width; canvas.height = rules.height;
    const renderer = await createSingleImageRenderer(canvas, { base: urls.base, map: urls.phase, lookup: urls.palette,
      sourcePeak: rules.sourcePeak, duration: rules.duration });
    const pixels = async (url) => {
      const image = new Image(); image.src = url; await image.decode();
      const c = document.createElement("canvas"); c.width = rules.width; c.height = rules.height;
      const context = c.getContext("2d"); context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, c.width, c.height).data;
    };
    const original = await pixels(urls.base), map = await pixels(urls.phase);
    const gl = canvas.getContext("webgl"), frames = [];
    let neutralMaxDifference = 0, referenceMaxDifference = 0, neutralPixels = 0;
    for (const seconds of [0, 1.4, 3.1, 6.2, rules.duration]) {
      renderer.render(seconds);
      const rgba = new Uint8Array(rules.width*rules.height*4);
      gl.readPixels(0, 0, rules.width, rules.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      const top = new Uint8Array(rgba.length);
      for (let y = 0; y < rules.height; y++) top.set(rgba.subarray((rules.height-1-y)*rules.width*4, (rules.height-y)*rules.width*4), y*rules.width*4);
      frames.push(top);
      for (let p = 0; p < top.length; p += 4) {
        if (!map[p+2]) {
          neutralPixels++;
          for (let c = 0; c < 3; c++) neutralMaxDifference = Math.max(neutralMaxDifference, Math.abs(top[p+c]-original[p+c]));
        }
        if (p % 508 === 0) {
          const rgb = Array.from(original.subarray(p, p+4));
          const maximum = Math.max(...rgb.slice(0, 3)), minimum = Math.min(...rgb.slice(0, 3));
          const saturation = maximum ? (maximum-minimum)/maximum : 0;
          const phase = (map[p]*256+map[p+1])/65535;
          const color = samplePalette(rules.sourcePalette, phaseAt(phase, seconds, rules.duration));
          const expected = shadePixel(rgb, saturation, map[p+2]/255, color, rules.sourcePeak);
          for (let c = 0; c < 3; c++) referenceMaxDifference = Math.max(referenceMaxDifference, Math.abs(top[p+c]-expected[c]));
        }
      }
    }
    let endpointMaxDifference = 0;
    for (let i = 0; i < frames[0].length; i++) endpointMaxDifference = Math.max(endpointMaxDifference, Math.abs(frames[0][i]-frames.at(-1)[i]));
    let count = 0, started, ended, totalDrawMs = 0;
    await new Promise((resolve) => {
      const tick = (now) => {
        if (!count) started = now;
        const start = performance.now(); renderer.render(count/60); gl.finish(); totalDrawMs += performance.now()-start;
        count++;
        if (count === 90) { ended = now; resolve(); } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    renderer.dispose();
    return { neutralMaxDifference, neutralPixels: neutralPixels/5, referenceMaxDifference, endpointMaxDifference,
      observedFps: 89/((ended-started)/1000), averageDrawMs: totalDrawMs/count };
  }, { rules, urls: report.imageUrls });
  assert.equal(report.gpu.neutralMaxDifference, 0);
  assert.equal(report.gpu.endpointMaxDifference, 0);
  assert(report.gpu.referenceMaxDifference <= 3, "GPU colors should match actual-source CPU palette mapping");
  await page.screenshot({ path: "tmp/single-image-motion/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "选择赛博朋克动效", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
  report.videoRequestsAfterSwitch = [...mediaRequests];
  assert.equal(await page.locator(".motion-artwork canvas").count(), 0);
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${base}/?view=motion&effect=effectRainbow`);
  await phone.waitForFunction(() => document.querySelector('.motion-artwork[aria-busy="false"] canvas'));
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(await phone.evaluate(() => {
    const track = document.querySelector('.motion-track[aria-pressed="true"]').getBoundingClientRect();
    const list = document.querySelector('.motion-playlist-items').getBoundingClientRect();
    return track.left >= list.left && track.right <= list.right;
  }), "The selected album must be visible in the horizontal mobile playlist");
  await phone.screenshot({ path: "tmp/single-image-motion/mobile.png", fullPage: true });
  assert.deepEqual(report.errors, []);
  report.mobileOverflow = false;
  await writeFile("tmp/single-image-motion/browser-verification.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
