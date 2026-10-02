// Stills and contact sheets for review.
//
//   node tools/still.mjs 1.25 15 40               full-size frames -> out/stills/
//   node tools/still.mjs --sheet 0:75 --count 30   a contact sheet -> out/sheet.png
//   options: --cols 6  --width 320  --out file.png  --blur (motion blur on)  --times 1,2.5,4
//            --phone (frames 360 px wide, as on a phone held upright)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { launch, openFilm, option, ROOT } from "./lib.mjs";

const args = process.argv.slice(2);
const blur = args.includes("--blur");
const browser = await launch();
const page = await openFilm(browser, { blur });

const sheet = option(args, "sheet", null);
const timesOpt = option(args, "times", null);
if (sheet || timesOpt) {
  let times;
  if (timesOpt) times = timesOpt.split(",").map(Number);
  else {
    const [a, b] = sheet.split(":").map(Number);
    const count = Number(option(args, "count", 24));
    times = Array.from({ length: count }, (_, i) => a + ((b - a) * i) / Math.max(1, count - (b >= 75 ? 0 : 1)));
  }
  const phone = args.includes("--phone");
  const cols = Number(option(args, "cols", phone ? 4 : 6));
  const width = Number(option(args, "width", phone ? 360 : 320));
  const out = resolve(ROOT, option(args, "out", phone ? "out/phone.png" : "out/sheet.png"));
  const data = await page.evaluate(
    async ({ times, cols, width }) => {
      const stage = document.getElementById("stage");
      const h = Math.round((width * 9) / 16);
      const label = 22;
      const rows = Math.ceil(times.length / cols);
      const c = document.createElement("canvas");
      c.width = cols * (width + 6) + 6;
      c.height = rows * (h + label + 6) + 6;
      const x = c.getContext("2d");
      x.fillStyle = "#222";
      x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingQuality = "high";
      times.forEach((t, i) => {
        window.seek(t);
        const cx = 6 + (i % cols) * (width + 6);
        const cy = 6 + Math.floor(i / cols) * (h + label + 6);
        x.drawImage(stage, cx, cy + label, width, h);
        x.fillStyle = "#ddd";
        x.font = "14px monospace";
        x.fillText(`${t.toFixed(2)} s`, cx + 2, cy + 15);
      });
      return c.toDataURL("image/png");
    },
    { times, cols, width },
  );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
  console.log(`wrote ${out} (${times.length} frames)`);
} else {
  const dir = resolve(ROOT, "out/stills");
  mkdirSync(dir, { recursive: true });
  for (const a of args.filter((x) => !x.startsWith("--"))) {
    const t = Number(a);
    const data = await page.evaluate((t) => {
      window.seek(t);
      return document.getElementById("stage").toDataURL("image/png");
    }, t);
    const file = resolve(dir, `t-${t.toFixed(3).padStart(7, "0")}.png`);
    writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
    console.log(`wrote ${file}`);
  }
}
await browser.close();
