// Headless Chromium with a real GPU: Metal on a Mac, SwiftShader where there is none.
// `--disable-gpu` would give an empty canvas.
import { chromium } from "playwright-core";

export async function launch(angle) {
  const backend = angle || process.env.ANGLE || (process.platform === "darwin" ? "metal" : "swiftshader");
  const args = backend === "swiftshader"
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
    : ["--headless=new", `--use-angle=${backend}`, "--enable-webgl", "--ignore-gpu-blocklist"];
  // --expose-gc lets the render free each posted frame at once: Chrome's blob store
  // otherwise fills with 25 MB frames faster than the collector reclaims them.
  return chromium.launch({ args: args.concat(["--force-color-profile=srgb", "--js-flags=--expose-gc"]) });
}

export function option(args, name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
}
