import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
await page.goto(process.argv[2] ?? "http://127.0.0.1:5174/");
if (process.argv[3] === "simulator") {
  await page.getByRole("button", { name: "进入模拟器" }).click();
  await page.locator(".drone-stage canvas").waitFor();
}
await page.waitForTimeout(1200);
if (process.argv[4]) await page.screenshot({ path: process.argv[4], fullPage: true });
console.log(JSON.stringify({
  title: await page.title(),
  canvases: await page.locator("canvas").count(),
  rootText: await page.locator("#root").innerText(),
  errors,
}, null, 2));
await browser.close();
