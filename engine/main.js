// The player. ?film=1 (default) or ?film=2.
//   ?w=1920      band width in pixels (the band is 2.39:1; the letterbox is the page's)
//   ?sub=4       motion blur subframes
//   ?t=18.5      hold one time, in trailer seconds
//   ?from=332&to=674   build only the shots that touch these trailer frames
//   ?view=labels|color|tiles&shot=troy   look at a picture before it is stone
import { loadFilm, makeTimeline, FOVY } from "./timeline.js";
import { createRenderer } from "./renderer.js";
import { toLinear, hexRgb } from "./util.js";

const params = new URLSearchParams(location.search);
const filmNo = parseInt(params.get("film") || "1", 10);
const W = parseInt(params.get("w") || "1920", 10);
const H = Math.round((W * 1608) / 3840 / 2) * 2;
const view = params.get("view");
const canvas = document.getElementById("stage");
canvas.width = W;
canvas.height = H;
const status = (msg) => {
  document.title = msg;
  console.log(msg);
};

function showPicture(layer, mode) {
  const pic = layer.pic;
  const g = canvas.getContext("2d");
  const img = new ImageData(pic.GW, pic.GH);
  for (let i = 0; i < pic.label.length; i++) {
    if (mode === "color") {
      img.data[i * 4] = pic.color[i * 4];
      img.data[i * 4 + 1] = pic.color[i * 4 + 1];
      img.data[i * 4 + 2] = pic.color[i * 4 + 2];
    } else {
      const id = pic.label[i];
      img.data[i * 4] = (id * 67) % 255;
      img.data[i * 4 + 1] = (id * 151) % 255;
      img.data[i * 4 + 2] = (id * 211) % 255;
    }
    img.data[i * 4 + 3] = 255;
  }
  const c = document.createElement("canvas");
  c.width = pic.GW;
  c.height = pic.GH;
  c.getContext("2d").putImageData(img, 0, 0);
  canvas.width = Math.min(pic.GW, 3200);
  canvas.height = Math.round((canvas.width * pic.GH) / pic.GW);
  g.drawImage(c, 0, 0, canvas.width, canvas.height);
}

// The laid stones in 2D, as at time t: a check of the cut and the colours.
function showTiles(layer, t) {
  const pic = layer.pic;
  canvas.width = Math.min(pic.GW, 3200);
  canvas.height = Math.round((canvas.width * pic.GH) / pic.GW);
  const g = canvas.getContext("2d");
  const s = canvas.width / pic.W;
  g.fillStyle = "#6f675c";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(s, 0, 0, s, 0, 0);
  for (const tile of layer.tiles) {
    if (t !== undefined && (tile.T > t || (tile.U !== undefined && tile.U < t))) continue;
    const c = Math.cos(tile.ang);
    const sn = Math.sin(tile.ang);
    const lin = tile.stone.lin;
    const k = 0.92 + 0.16 * tile.seed;
    g.fillStyle = "rgb(" + lin.map((v) => Math.round(255 * Math.pow(Math.min(1, v * k), 1 / 2.2))).join(",") + ")";
    g.beginPath();
    tile.quad.forEach((q, i) => {
      const x = tile.x + q[0] * c - q[1] * sn;
      const y = tile.y + q[0] * sn + q[1] * c;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.fill();
  }
}

window.ready = (async () => {
  const from = params.has("from") ? parseInt(params.get("from"), 10) : undefined;
  const to = params.has("to") ? parseInt(params.get("to"), 10) : undefined;
  const t0 = performance.now();
  const film = await loadFilm(filmNo, { from, to, log: status });
  window.__film = film;
  const fps = film.fps;
  const first = from !== undefined ? from : 0;
  const last = to !== undefined ? to : film.table.frames;
  window.filmInfo = { film: filmNo, fps, fpsRational: film.table.fps, from: first, to: last, W, H, setupMs: Math.round(performance.now() - t0),
    stones: film.layers.map((L) => ({ shot: L.scene.id, count: L.tiles.length, timing: L.timing })) };

  if (view === "hash") {
    // Fingerprints for determinism checks: the label partition (blind to id values), and
    // the stones' cut, colour and timing.
    const fnv = (h, v) => Math.imul(h ^ (v >>> 0), 16777619) >>> 0;
    window.hashes = film.layers.map((L) => {
      const seen = new Map();
      let hl = 2166136261;
      for (let i = 0; i < L.pic.label.length; i++) {
        const id = L.pic.label[i];
        if (!seen.has(id)) seen.set(id, seen.size);
        hl = fnv(hl, seen.get(id));
      }
      let ht = 2166136261;
      let hs = 2166136261;
      for (const t of L.tiles) {
        for (const v of [t.x, t.y, t.a, t.b, t.quad[0][0], t.quad[2][1]]) ht = fnv(ht, Math.round(v * 100));
        hs = fnv(fnv(hs, Math.round(t.T * 1e4)), parseInt(t.stone.hex.slice(1), 16));
      }
      return { shot: L.scene.id, regions: seen.size, labels: hl.toString(16), tiles: L.tiles.length, cut: ht.toString(16), stones: hs.toString(16) };
    });
    // The first picture's partition as an image, ids renumbered by first appearance.
    const L0 = film.layers.find((L) => L.scene.id === (params.get("shot") || L.scene.id));
    canvas.width = L0.pic.GW;
    canvas.height = L0.pic.GH;
    const img = new ImageData(L0.pic.GW, L0.pic.GH);
    const order = new Map();
    for (let i = 0; i < L0.pic.label.length; i++) {
      const id = L0.pic.label[i];
      if (!order.has(id)) order.set(id, order.size);
      const v = order.get(id);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    canvas.getContext("2d").putImageData(img, 0, 0);
    window.seek = () => 0;
    status("hash " + JSON.stringify(window.hashes));
    return;
  }

  if (view) {
    const layer = film.layers.find((L) => L.scene.id === (params.get("shot") || L.scene.id));
    if (view === "tiles") showTiles(layer, params.has("t") ? parseFloat(params.get("t")) : undefined);
    else showPicture(layer, view);
    window.seek = () => 0;
    status("view " + view);
    return;
  }

  const timeline = makeTimeline(film, W, H);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!gl) throw new Error("WebGL2 is missing");
  const renderer = createRenderer(gl, {
    W, H, FOVY, timeline,
    shutter: 0.5 / fps,
    aperture: 0.03,
    coat: hexRgb("#bdb3a2").map(toLinear),
    sinopia: hexRgb("#7a2a18").map(toLinear)
  });
  for (const L of film.layers) {
    renderer.addLayer(L);
    L.tiles = null;
    L.owners = null;
    L.pic.label = null;
    L.pic.color = null;
  }
  window.SUBFRAMES = parseInt(params.get("sub") || "1", 10);
  window.seek = function (t) {
    renderer.render(t, window.SUBFRAMES);
    return t;
  };
  status(`ready in ${window.filmInfo.setupMs} ms: ${window.filmInfo.stones.map((s) => s.shot + " " + s.count).join(", ")}`);
  if (params.has("t")) {
    window.seek(parseFloat(params.get("t")));
  } else if (!navigator.webdriver) {
    const a = first / fps;
    const b = last / fps;
    const started = performance.now();
    const tick = (now) => {
      window.seek(a + (((now - started) / 1000) % (b - a)));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    window.seek(first / fps);
  }
})();
window.ready.catch((e) => {
  status("ERR " + e.message);
  const pre = document.createElement("pre");
  pre.textContent = e.stack || String(e);
  pre.style.cssText = "position:fixed;inset:12px;color:#1c120c;background:#f3eee4;padding:12px;overflow:auto;z-index:9";
  document.body.appendChild(pre);
});
