#!/usr/bin/env python3
"""Independent resource guard for rendering jobs (macOS).

Runs a command in its own session and process group, then samples every --interval seconds:
  - the physical footprint of every process in the job (the command, all of its descendants and
    every member of its process group: Node workers, ffmpeg encoders, anything they spawn), read
    from the kernel with proc_pid_rusage, so native allocations such as canvas surfaces and encoder
    buffers are counted, not only the JavaScript heap;
  - system memory pressure (kern.memorystatus_vm_pressure_level), swap in use, and the memory
    held by the compressor.
If a limit is crossed it records why, stops the whole job (SIGTERM to the job's process group and
to every descendant, then SIGKILL after a grace period), checks that nothing from the job is left,
and exits with status 3. It never restarts the job.

usage: python3 tools/render_guard.py --log-dir DIR [limits] -- command args...
exit status: the job's own status when no limit was crossed; 3 = stopped by the guard;
             4 = refused to start (memory pressure already high).
"""
import argparse
import ctypes
import ctypes.util
import csv
import json
import os
import signal
import struct
import subprocess
import sys
import time

libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
libproc = ctypes.CDLL('/usr/lib/libproc.dylib', use_errno=True)
RUSAGE_INFO_V4 = 4
MB = 1 << 20


def footprint(pid):
    """(current, lifetime maximum) physical footprint in bytes, or None if the process is gone"""
    buf = ctypes.create_string_buffer(512)
    if libproc.proc_pid_rusage(pid, RUSAGE_INFO_V4, buf) != 0:
        return None
    cur, = struct.unpack_from('<Q', buf.raw, 72)  # ri_phys_footprint
    life, = struct.unpack_from('<Q', buf.raw, 240)  # ri_lifetime_max_phys_footprint
    return cur, life


def sysctl_int(name):
    v = ctypes.c_int(0)
    sz = ctypes.c_size_t(ctypes.sizeof(v))
    if libc.sysctlbyname(name.encode(), ctypes.byref(v), ctypes.byref(sz), None, 0) != 0:
        return None
    return v.value


class XswUsage(ctypes.Structure):
    _fields_ = [('total', ctypes.c_uint64), ('avail', ctypes.c_uint64), ('used', ctypes.c_uint64),
                ('pagesize', ctypes.c_uint32), ('encrypted', ctypes.c_bool)]


def swap_used():
    x = XswUsage()
    sz = ctypes.c_size_t(ctypes.sizeof(x))
    if libc.sysctlbyname(b'vm.swapusage', ctypes.byref(x), ctypes.byref(sz), None, 0) != 0:
        return 0
    return x.used


def vm_stat():
    out = subprocess.run(['vm_stat'], capture_output=True, text=True).stdout.splitlines()
    page = 16384
    if out and 'page size of' in out[0]:
        page = int(out[0].split('page size of')[1].split()[0])
    vals = {}
    for line in out[1:]:
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        try:
            vals[k.strip().strip('"')] = int(v.strip().rstrip('.'))
        except ValueError:
            pass
    return {
        'compressor': vals.get('Pages occupied by compressor', 0) * page,
        'free': (vals.get('Pages free', 0) + vals.get('Pages speculative', 0)) * page,
        'inactive': vals.get('Pages inactive', 0) * page,
    }


def process_table():
    out = subprocess.run(['ps', '-A', '-o', 'pid=,ppid=,pgid=,comm='], capture_output=True, text=True).stdout
    rows = []
    for line in out.splitlines():
        parts = line.split(None, 3)
        if len(parts) < 3:
            continue
        try:
            rows.append((int(parts[0]), int(parts[1]), int(parts[2]), parts[3] if len(parts) > 3 else '?'))
        except ValueError:
            pass
    return rows


def job_pids(root, pgid, root_alive):
    """pid -> short name for everything that belongs to the job"""
    rows = process_table()
    names = {pid: os.path.basename(comm) for pid, _, _, comm in rows}
    kids = {}
    for pid, ppid, _, _ in rows:
        kids.setdefault(ppid, []).append(pid)
    # start from the group's members (and the command itself while it has not been reaped, so its
    # pid cannot have been reused) and take every descendant, even one that left the group
    stack = [pid for pid, _, pg, _ in rows if pg == pgid] + ([root] if root_alive else [])
    members = set()
    while stack:
        p = stack.pop()
        if p in members:
            continue
        members.add(p)
        stack.extend(kids.get(p, []))
    members.discard(os.getpid())
    return {p: names.get(p, '?') for p in members if p in names}


def kind(name):
    n = name.lower()
    if 'ffmpeg' in n:
        return 'ffmpeg'
    if 'node' in n:
        return 'node'
    return 'other'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--log-dir', required=True)
    ap.add_argument('--max-tree-mb', type=float, default=5000, help='total footprint of the job')
    ap.add_argument('--max-proc-mb', type=float, default=1800, help='footprint of any one process')
    ap.add_argument('--max-swap-growth-mb', type=float, default=256)
    ap.add_argument('--max-compressor-growth-mb', type=float, default=1536)
    ap.add_argument('--stop-pressure', type=int, default=2, help='stop at this kernel pressure level (2 = warning)')
    ap.add_argument('--max-seconds', type=float, default=0, help='wall-time limit (0 = none)')
    ap.add_argument('--interval', type=float, default=0.1, help='seconds between footprint samples')
    ap.add_argument('--grace', type=float, default=4.0, help='seconds between SIGTERM and SIGKILL')
    ap.add_argument('cmd', nargs=argparse.REMAINDER)
    a = ap.parse_args()
    cmd = a.cmd[1:] if a.cmd and a.cmd[0] == '--' else a.cmd
    if not cmd:
        ap.error('no command given')
    os.makedirs(a.log_dir, exist_ok=True)
    limits = {k: getattr(a, k) for k in ('max_tree_mb', 'max_proc_mb', 'max_swap_growth_mb', 'max_compressor_growth_mb', 'stop_pressure', 'max_seconds', 'interval', 'grace')}
    summary_path = os.path.join(a.log_dir, 'guard_summary.json')
    pressure0 = sysctl_int('kern.memorystatus_vm_pressure_level') or 1
    swap0 = swap_used()
    vm0 = vm_stat()
    if pressure0 >= a.stop_pressure:
        rec = {'status': 'refused', 'reason': f'memory pressure level {pressure0} before launch', 'cmd': cmd, 'limits': limits}
        json.dump(rec, open(summary_path, 'w'), indent=2)
        print('[guard] refused to start:', rec['reason'], file=sys.stderr)
        return 4

    env = dict(os.environ, BL_GUARDED='1')
    proc = subprocess.Popen(cmd, start_new_session=True, env=env)
    pgid = proc.pid
    t0 = time.time()
    print(f'[guard] job pid/pgid {pgid}; limits tree {a.max_tree_mb:.0f} MB, process {a.max_proc_mb:.0f} MB, '
          f'pressure >= {a.stop_pressure}, swap +{a.max_swap_growth_mb:.0f} MB, compressor +{a.max_compressor_growth_mb:.0f} MB', file=sys.stderr)

    stop = {'reason': None}

    def on_signal(sig, _frame):
        stop['reason'] = f'guard received signal {signal.Signals(sig).name}'
    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    peaks = {'tree_mb': 0.0, 'proc_mb': 0.0, 'proc': None, 'node_mb': 0.0, 'ffmpeg_mb': 0.0,
             'node_tree_mb': 0.0, 'ffmpeg_tree_mb': 0.0, 'pressure': pressure0,
             'swap_growth_mb': 0.0, 'compressor_growth_mb': 0.0, 'procs': 0}
    lifetime = {}  # pid -> (name, lifetime max footprint bytes) last seen
    fcsv = open(os.path.join(a.log_dir, 'guard_samples.csv'), 'w', newline='')
    w = csv.writer(fcsv)
    w.writerow(['t', 'procs', 'tree_mb', 'node_mb', 'ffmpeg_mb', 'max_proc_mb', 'max_proc', 'pressure', 'swap_used_mb', 'compressor_mb', 'free_mb'])
    last = None
    root_alive = True
    # Footprint is sampled every --interval. A single frame can allocate gigabytes, so the
    # default is short. vm_stat and sysctl are slower; refresh them about twice a second.
    sys_every = 0.5
    last_sys_at = 0.0
    pressure = pressure0
    swap_g = 0.0
    vm = vm0
    while True:
        if root_alive and proc.poll() is not None:
            root_alive = False
        pids = job_pids(proc.pid, pgid, root_alive)
        per = {}
        for pid, name in pids.items():
            f = footprint(pid)
            if f is None:
                continue
            per[pid] = (name, f[0])
            prev = lifetime.get(pid, (name, 0))[1]
            lifetime[pid] = (name, max(prev, f[1]))
        tree = sum(v[1] for v in per.values()) / MB
        node = sum(v[1] for v in per.values() if kind(v[0]) == 'node') / MB
        ff = sum(v[1] for v in per.values() if kind(v[0]) == 'ffmpeg') / MB
        mp = max(per.items(), key=lambda kv: kv[1][1]) if per else None
        now = time.time()
        if now - last_sys_at >= sys_every:
            last_sys_at = now
            pressure = sysctl_int('kern.memorystatus_vm_pressure_level') or 1
            swap_g = (swap_used() - swap0) / MB
            vm = vm_stat()
        comp_g = (vm['compressor'] - vm0['compressor']) / MB
        el = time.time() - t0
        last = {'t': round(el, 2), 'procs': len(per), 'tree_mb': round(tree, 1), 'node_mb': round(node, 1), 'ffmpeg_mb': round(ff, 1),
                'max_proc_mb': round(mp[1][1] / MB, 1) if mp else 0, 'max_proc': f'{mp[1][0]}:{mp[0]}' if mp else '',
                'pressure': pressure, 'swap_growth_mb': round(swap_g, 1), 'compressor_growth_mb': round(comp_g, 1), 'free_mb': round(vm['free'] / MB, 1)}
        w.writerow([last['t'], last['procs'], last['tree_mb'], last['node_mb'], last['ffmpeg_mb'], last['max_proc_mb'], last['max_proc'],
                    pressure, round(swap_used() / MB, 1), round(vm['compressor'] / MB, 1), last['free_mb']])
        fcsv.flush()
        peaks['tree_mb'] = max(peaks['tree_mb'], tree)
        peaks['procs'] = max(peaks['procs'], len(per))
        if mp and mp[1][1] / MB > peaks['proc_mb']:
            peaks['proc_mb'], peaks['proc'] = mp[1][1] / MB, f'{mp[1][0]}:{mp[0]}'
        for v in per.values():
            k = kind(v[0])
            if k in ('node', 'ffmpeg'):
                peaks[k + '_mb'] = max(peaks[k + '_mb'], v[1] / MB)
        peaks['node_tree_mb'] = max(peaks['node_tree_mb'], node)
        peaks['ffmpeg_tree_mb'] = max(peaks['ffmpeg_tree_mb'], ff)
        peaks['pressure'] = max(peaks['pressure'], pressure)
        peaks['swap_growth_mb'] = max(peaks['swap_growth_mb'], swap_g)
        peaks['compressor_growth_mb'] = max(peaks['compressor_growth_mb'], comp_g)

        if stop['reason'] is None:
            if pressure >= a.stop_pressure:
                stop['reason'] = f'system memory pressure level {pressure} (limit {a.stop_pressure})'
            elif swap_g > a.max_swap_growth_mb:
                stop['reason'] = f'swap grew {swap_g:.0f} MB (limit {a.max_swap_growth_mb:.0f})'
            elif comp_g > a.max_compressor_growth_mb:
                stop['reason'] = f'compressed memory grew {comp_g:.0f} MB (limit {a.max_compressor_growth_mb:.0f})'
            elif tree > a.max_tree_mb:
                stop['reason'] = f'job footprint {tree:.0f} MB (limit {a.max_tree_mb:.0f})'
            elif mp and mp[1][1] / MB > a.max_proc_mb:
                stop['reason'] = f'process {mp[1][0]} pid {mp[0]} footprint {mp[1][1] / MB:.0f} MB (limit {a.max_proc_mb:.0f})'
            elif a.max_seconds and el > a.max_seconds:
                stop['reason'] = f'wall time {el:.0f} s (limit {a.max_seconds:.0f})'
        if stop['reason'] is not None:
            break
        if not root_alive and not per:
            break
        time.sleep(a.interval)

    stopped = stop['reason'] is not None
    leftovers = {}
    if stopped:
        print(f'[guard] STOP: {stop["reason"]}', file=sys.stderr)
        leftovers = terminate(proc, pgid, a.grace)
    else:
        # the job finished by itself: anything it left behind in its group is also cleaned up
        rest = job_pids(proc.pid, pgid, False)
        if rest:
            leftovers = terminate(proc, pgid, a.grace)
    status = proc.wait()
    ended = time.time()
    summary = {
        'status': 'stopped' if stopped else ('ok' if status == 0 else 'failed'),
        'reason': stop['reason'],
        'job_exit': status,
        'cmd': cmd,
        'limits': limits,
        'seconds': round(ended - t0, 1),
        'peaks': {k: (round(v, 1) if isinstance(v, float) else v) for k, v in peaks.items()},
        'lifetime_max_mb': {f'{n}:{p}': round(v / MB, 1) for p, (n, v) in sorted(lifetime.items(), key=lambda kv: -kv[1][1])[:20]},
        'last_sample': last,
        'processes_left_after_stop': leftovers,
        'baseline': {'pressure': pressure0, 'swap_mb': round(swap0 / MB, 1), 'compressor_mb': round(vm0['compressor'] / MB, 1)},
    }
    json.dump(summary, open(summary_path, 'w'), indent=2)
    fcsv.close()
    print(f'[guard] {summary["status"]}: job exit {status}, peak job footprint {peaks["tree_mb"]:.0f} MB, '
          f'peak process {peaks["proc_mb"]:.0f} MB ({peaks["proc"]}), pressure max {peaks["pressure"]}', file=sys.stderr)
    if stopped:
        return 3
    return status if status >= 0 else 128 - status


def terminate(proc, pgid, grace):
    """SIGTERM the job's group and descendants, SIGKILL whatever remains; returns what could not be stopped"""
    def signal_all(sig):
        try:
            os.killpg(pgid, sig)
        except (ProcessLookupError, PermissionError):
            pass
        for pid in job_pids(proc.pid, pgid, proc.poll() is None):
            try:
                os.kill(pid, sig)
            except (ProcessLookupError, PermissionError):
                pass
    signal_all(signal.SIGTERM)
    deadline = time.time() + grace
    while time.time() < deadline:
        proc.poll()
        if not job_pids(proc.pid, pgid, proc.returncode is None):
            return {}
        time.sleep(0.1)
    signal_all(signal.SIGKILL)
    time.sleep(0.5)
    proc.poll()
    return job_pids(proc.pid, pgid, proc.returncode is None)


if __name__ == '__main__':
    sys.exit(main())
