// Shared by the tools: open the film in headless Chromium.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function launch() {
  const executablePath = process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : undefined;
  return chromium.launch({ executablePath, args: ["--disable-lcd-text", "--force-color-profile=srgb"] });
}

// A page showing the film at 1920 x 1080. blur: average 4 subframes per frame.
export async function openFilm(browser, { blur = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => {
    console.error("page error:", error.message);
    process.exitCode = 1;
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("console:", msg.text());
  });
  const url = pathToFileURL(resolve(ROOT, "index.html")).href + `?render${blur ? "" : "&blur=0"}`;
  await page.goto(url);
  await page.evaluate(() => window.film.ready);
  return page;
}

export function option(args, name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
}
