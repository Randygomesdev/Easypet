#!/usr/bin/env python3
"""Read-only Linux host/cgroup sampler. Never reads container environment or logs."""
import argparse
import datetime
import json
import pathlib
import subprocess
import time


def read(path):
    return pathlib.Path(path).read_text().strip()


def counters(path):
    return {key: int(value) for key, value in (line.split() for line in read(path).splitlines())}


def containers():
    ids = subprocess.check_output(['docker', 'ps', '-q'], text=True, timeout=10).split()
    if not ids:
        return []
    template = '{{.Name}}|{{.State.Pid}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.State.StartedAt}}'
    rows = subprocess.check_output(['docker', 'inspect', '--format', template, *ids], text=True, timeout=10)
    result = []
    for row in rows.splitlines():
        name, pid, restarts, oom, started = row.split('|')
        item = dict(name=name.lstrip('/'), restarts=int(restarts), oomKilled=oom == 'true', startedAt=started)
        try:
            group = next(line[3:] for line in read('/proc/' + pid + '/cgroup').splitlines() if line.startswith('0::'))
            root = pathlib.Path('/sys/fs/cgroup') / group.lstrip('/')
            for filename, field in [('memory.current', 'currentBytes'), ('memory.peak', 'lifetimePeakBytes'),
                                    ('memory.max', 'limitBytes'), ('memory.swap.current', 'swapBytes')]:
                value = read(root / filename)
                item[field] = int(value) if value.isdigit() else value
            item['events'] = counters(root / 'memory.events')
            stat = counters(root / 'memory.stat')
            item['anonBytes'] = stat.get('anon')
            item['fileBytes'] = stat.get('file')
            item['inactiveFileBytes'] = stat.get('inactive_file')
        except (OSError, StopIteration, ValueError) as error:
            item['measurementError'] = type(error).__name__
        result.append(item)
    return result


def sample():
    memory = {}
    for line in read('/proc/meminfo').splitlines():
        key, value = line.split(':', 1)
        if key in ['MemTotal', 'MemAvailable', 'SwapTotal', 'SwapFree']:
            memory[key + 'Bytes'] = int(value.split()[0]) * 1024
    cpu = [int(value) for value in read('/proc/stat').splitlines()[0].split()[1:]]
    return dict(capturedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), memory=memory,
                cpuTicks=cpu, loadAverage=read('/proc/loadavg').split()[:3],
                memoryPressure=read('/proc/pressure/memory'), containers=containers())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples', type=int, default=1)
    parser.add_argument('--interval', type=int, default=10)
    args = parser.parse_args()
    if not 1 <= args.samples <= 360 or not 1 <= args.interval <= 60:
        parser.error('samples must be 1..360 and interval 1..60 seconds')
    for index in range(args.samples):
        print(json.dumps(sample(), separators=(',', ':')), flush=True)
        if index + 1 < args.samples:
            time.sleep(args.interval)
