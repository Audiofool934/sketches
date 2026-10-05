// Parallel render of the whole film (or a time range), then join and mux the original audio.
// usage: node src/render.mjs --out render/borrowed_lines.mp4 [--scale 1] [--workers N] [--animatic]
//        [--from 0 --to 256.705] [--crf 16] [--work dir] [--chunk-frames 240]
//
// Unless already launched under tools/render_guard.py, this re-execs itself there.
// The guard stops the whole process tree on memory pressure and does not retry.
// Finished segments (a sibling .ok file whose size matches the mp4) are kept and skipped.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

// Peak physical footprint at 1080p, crf 16, preset slow, measured 2026-09-28 (kernel lifetime maxima).
// Node renderer: 980 MB for one process that rendered every 60th frame of the whole film (every
// scene's caches at once); 853 MB for the heaviest 240-frame chunk (the city); 210-578 MB elsewhere.
// x264 with 4 threads: 693 MB once its lookahead is full (887 MB at the default thread count).
// proc is the larger single process; tree is one worker: renderer plus encoder.
const MEASURED_PROC_MB = 980;
const MEASURED_TREE_MB = 1700;
const FOOTPRINT_MARGIN = 1.35;
const SYSTEM_RESERVE_MB = 4096;
const DEFAULT_CHUNK_FRAMES = 240;

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

function setOpt(argv, key, value) {
  const out = argv.slice();
  const flag = '--' + key;
  const i = out.indexOf(flag);
  if (i >= 0) {
    if (out[i + 1] === undefined || String(out[i + 1]).startsWith('--')) out.splice(i + 1, 0, String(value));
    else out[i + 1] = String(value);
  } else out.push(flag, String(value));
  return out;
}

function reclaimableMb() {
  const out = spawnSync('vm_stat', { encoding: 'utf8' }).stdout || '';
  const page = Number((/page size of (\d+)/.exec(out) || [])[1] || 16384);
  const pages = (name) => {
    const m = new RegExp(name + ':\\s+(\\d+)').exec(out);
    return m ? Number(m[1]) : 0;
  };
  const n = pages('Pages free') + pages('Pages speculative') + pages('Pages inactive');
  return (n * page) / (1024 * 1024);
}

function launchGuarded() {
  const requested = opt('workers', null);
  const asked = requested == null || requested === true ? null : parseInt(requested, 10);
  if (asked != null && (!Number.isInteger(asked) || asked < 1)) {
    console.error('[render] --workers must be a positive integer');
    process.exit(2);
  }
  const perProc = MEASURED_PROC_MB * FOOTPRINT_MARGIN;
  const perTree = MEASURED_TREE_MB * FOOTPRINT_MARGIN;
  const avail = reclaimableMb();
  const budget = Math.max(perTree, avail - SYSTEM_RESERVE_MB);
  const fit = Math.max(1, Math.floor(budget / perTree));
  const workers = Math.min(asked == null ? fit : asked, fit);
  const out = String(opt('out', 'render/borrowed_lines.mp4'));
  // one record per attempt, kept next to the segments it produced
  const workDir = String(opt('work', path.join(path.dirname(out), 'segments')));
  const logDir = path.join(path.resolve(workDir), 'guard', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(logDir, { recursive: true });
  const childArgs = setOpt(process.argv.slice(1), 'workers', workers);
  const treeLimit = Math.ceil(workers * perTree);
  const procLimit = Math.ceil(perProc);
  console.error(`[render] reclaimable ${avail.toFixed(0)} MB, budget ${budget.toFixed(0)} MB, workers ${workers}${asked != null && asked !== workers ? ` (asked ${asked})` : ''}`);
  console.error(`[render] guard limits: process ${procLimit} MB, tree ${treeLimit} MB, log ${logDir}`);
  const guard = path.resolve(path.dirname(process.argv[1]), '../tools/render_guard.py');
  const r = spawnSync('python3', [
    guard,
    '--log-dir', logDir,
    '--max-tree-mb', String(treeLimit),
    '--max-proc-mb', String(procLimit),
    '--max-swap-growth-mb', '256',
    '--max-compressor-growth-mb', '1536',
    '--stop-pressure', '2',
    '--',
    process.execPath,
    ...childArgs,
  ], { stdio: 'inherit' });
  if (r.error) {
    console.error('[render] could not start the resource guard:', r.error.message);
    process.exit(1);
  }
  // The guard already stopped the job if a limit was hit. Do not start it again.
  process.exit(r.status === null ? 1 : r.status);
}

if (process.env.BL_GUARDED !== '1') launchGuarded();

const { FPS, FRAMES } = await import('./film.mjs');

const out = String(opt('out', 'render/borrowed_lines.mp4'));
const scale = String(opt('scale', '1'));
const workers = parseInt(opt('workers', 1), 10);
const animatic = !!opt('animatic', false);
const crf = String(opt('crf', '16'));
const preset = String(opt('preset', 'slow'));
const audio = String(opt('audio', '/Users/audiofool/Desktop/song.mp3'));
const chunkFrames = parseInt(opt('chunk-frames', DEFAULT_CHUNK_FRAMES), 10);
const f0 = Math.round(parseFloat(opt('from', 0)) * FPS);
const f1 = opt('to', null) ? Math.round(parseFloat(opt('to')) * FPS) : FRAMES;
const work = String(opt('work', path.join(path.dirname(out), 'segments')));

if (!Number.isInteger(workers) || workers < 1) {
  console.error('[render] --workers must be a positive integer');
  process.exit(2);
}
if (!Number.isInteger(chunkFrames) || chunkFrames < 1) {
  console.error('[render] --chunk-frames must be a positive integer');
  process.exit(2);
}
if (!(f1 > f0)) {
  console.error('[render] empty frame range');
  process.exit(2);
}
if (!fs.existsSync(audio)) {
  console.error('[render] audio not found:', audio);
  process.exit(2);
}

fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

const plan = { f0, f1, chunkFrames, scale, crf, preset, animatic: animatic ? 1 : 0 };
const planPath = path.join(work, 'plan.json');
if (fs.existsSync(planPath)) {
  const prev = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const same = Object.keys(plan).every((k) => String(prev[k]) === String(plan[k]));
  if (!same) {
    console.error('[render] existing segments were made with a different plan:', JSON.stringify(prev));
    console.error('[render] this render is', JSON.stringify(plan), '- use another --work directory');
    process.exit(2);
  }
} else {
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
}

const jobs = [];
for (let s = f0, k = 0; s < f1; s += chunkFrames, k++) {
  const e = Math.min(f1, s + chunkFrames);
  const file = path.join(work, `seg_${String(k).padStart(3, '0')}.mp4`);
  jobs.push({ k, s, e, file, mark: file + '.ok' });
}

function isDone(j) {
  try {
    const sz = fs.statSync(j.file).size;
    return sz > 0 && fs.readFileSync(j.mark, 'utf8') === String(sz);
  } catch {
    return false;
  }
}

const children = new Set();
let failure = null;
function stopChildren() {
  for (const p of children) {
    try { p.kill('SIGTERM'); } catch { /* already gone */ }
  }
}
function noteFailure(info) {
  if (failure) return;
  failure = info;
  stopChildren();
  const rec = { status: 'failed', ...info, at: new Date().toISOString() };
  fs.writeFileSync(path.join(work, 'failure.json'), JSON.stringify(rec, null, 2));
  console.error(`[render] failed: ${info.error}`);
  console.error('[render] completed segments were kept; this job will not retry');
}
process.on('SIGTERM', () => { stopChildren(); process.exit(143); });
process.on('SIGINT', () => { stopChildren(); process.exit(130); });

function runJob(j) {
  return new Promise((resolve) => {
    if (failure) return resolve();
    if (isDone(j)) {
      console.error(`[render] skip chunk ${j.k} (frames ${j.s}-${j.e})`);
      return resolve();
    }
    fs.rmSync(j.mark, { force: true });
    console.error(`[render] start chunk ${j.k} (frames ${j.s}-${j.e})`);
    const a = ['src/render_worker.mjs', '--start', j.s, '--end', j.e, '--scale', scale, '--out', j.file, '--crf', crf, '--preset', preset];
    if (animatic) a.push('--animatic');
    const p = spawn(process.execPath, a.map(String), { stdio: ['ignore', 'inherit', 'inherit'] });
    children.add(p);
    p.on('close', (code) => {
      children.delete(p);
      if (failure) return resolve();
      if (code === 0) {
        try {
          const sz = fs.statSync(j.file).size;
          if (sz > 0) {
            fs.writeFileSync(j.mark, String(sz));
            console.error(`[render] done chunk ${j.k}`);
            return resolve();
          }
        } catch { /* fall through */ }
      }
      noteFailure({ error: `chunk ${j.k} exited ${code}`, chunk: j.k, code });
      resolve();
    });
  });
}

let next = 0;
await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async () => {
  while (!failure && next < jobs.length) {
    const j = jobs[next++];
    await runJob(j);
  }
}));

if (failure) process.exit(1);

const missing = jobs.filter((j) => !isDone(j));
if (missing.length) {
  noteFailure({ error: `missing segments: ${missing.map((j) => j.k).join(',')}` });
  process.exit(1);
}

const list = path.join(work, 'list.txt');
fs.writeFileSync(list, jobs.map((j) => `file '${path.resolve(j.file)}'`).join('\n'));
const run = (cmd, a) => new Promise((resolve) => {
  const p = spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] });
  children.add(p);
  p.on('close', (code) => {
    children.delete(p);
    if (code !== 0) noteFailure({ error: `${cmd} exited ${code}`, code });
    resolve();
  });
});
const video = path.join(work, 'video.mp4');
await run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
if (failure) process.exit(1);
const ss = (f0 / FPS).toFixed(6);
const dur = ((f1 - f0) / FPS).toFixed(6);
const aArgs = f0 > 0 || f1 < FRAMES ? ['-ss', ss, '-t', dur] : [];
await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, ...aArgs, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out]);
if (failure) process.exit(1);
try { fs.rmSync(path.join(work, 'failure.json'), { force: true }); } catch { /* none */ }
console.log('wrote', out);
