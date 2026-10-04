// Stills for review: seek a list of trailer times and save each frame as a PNG.
//
//   node tools/still.mjs --film 1 --w 1280 --t 14.6,16,17.5,19 --out ref/stills/a
//   node tools/still.mjs --film 1 --w 1600 --view tiles --shot desert --t 16 --out ref/stills/tiles
//   --sub 4 turns on the film's motion blur; --from/--to limit the shots that are built.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { launch, option } from "./browser.mjs";
import { handler } from "./serve.mjs";

const args = process.argv.slice(2);
const film = option(args, "film", "1");
const W = option(args, "w", "1280");
const sub = option(args, "sub", "1");
const out = path.resolve(option(args, "out", "ref/stills/run"));
const times = option(args, "t", "16").split(",").map(Number);
const extra = ["from", "to", "view", "shot"].filter((k) => option(args, k)).map((k) => `&${k}=${option(args, k)}`).join("");
fs.mkdirSync(out, { recursive: true });

const server = http.createServer(handler);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (m) => console.log("page:", m.text()));
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  const url = `http://127.0.0.1:${server.address().port}/index.html?film=${film}&w=${W}&sub=${sub}${extra}`;
  const t0 = Date.now();
  await page.goto(url, { timeout: 600000 });
  // A module that fails to parse never runs, so wait for it to start before waiting for it to finish.
  await page.waitForFunction(() => window.ready !== undefined, null, { timeout: 20000 }).catch(async () => {
    throw new Error("the page did not start: " + (await page.title()));
  });
  const limit = parseFloat(option(args, "timeout", "300")) * 1000;
  await Promise.race([
    page.evaluate(() => window.ready),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`the page did not finish loading in ${limit / 1000} s`)), limit).unref())
  ]);
  const title = await page.title();
  if (title.startsWith("ERR")) throw new Error(title);
  console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`, JSON.stringify(await page.evaluate(() => window.filmInfo)));
  for (const t of times) {
    const a = Date.now();
    const png = await page.evaluate((t) => {
      window.seek(t);
      return document.getElementById("stage").toDataURL("image/png");
    }, t);
    const file = path.join(out, `t${t.toFixed(3)}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
    console.log(`${file}  ${Date.now() - a} ms`);
  }
} finally {
  await browser.close();
  server.close();
}
