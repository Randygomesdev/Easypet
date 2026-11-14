#!/usr/bin/env python3
"""Publish a bounded status snapshot for one EasyPet Compose project. No logs or environment."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

SERVICES = (
    'frontend', 'gateway-service', 'auth-service', 'pet-service', 'partner-service',
    'booking-service', 'payment-service', 'notification-service', 'auth-db', 'pet-db',
    'partner-db', 'booking-db', 'payment-db', 'notification-db', 'redis', 'smtp-capture',
)
FORMAT = ('{{index .Config.Labels "com.docker.compose.service"}}|{{.Id}}|{{.State.Status}}|'
          '{{with index .State "Health"}}{{.Status}}{{else}}none{{end}}|'
          '{{.State.StartedAt}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.HostConfig.Memory}}')


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, timeout=10,
                                   stderr=subprocess.DEVNULL).strip()


def parse_inventory(output):
    inventory = {}
    for line in output.splitlines():
        fields = line.split('|')
        if len(fields) != 8 or fields[0] not in SERVICES:
            continue
        if fields[0] in inventory:
            raise ValueError('Multiple containers for one service')
        inventory[fields[0]] = fields
    return inventory


def service_status(name, fields):
    result = dict(id=name, status='MISSING', startedAt=None, restarts=None,
                  oomKilled=False, memoryBytes=None, limitBytes=None)
    if fields is None:
        return result
    _, container, state, health, started, restarts, oom, limit = fields
    result.update(startedAt=started if not started.startswith('0001-') else None,
                  restarts=int(restarts), oomKilled=oom == 'true', limitBytes=int(limit) or None)
    if state != 'running':
        result['status'] = 'STOPPED'
        return result
    result['status'] = {'healthy': 'HEALTHY', 'unhealthy': 'UNHEALTHY'}.get(health, 'UNKNOWN')
    try:
        value = docker('exec', container, 'cat', '/sys/fs/cgroup/memory.current')
        result['memoryBytes'] = int(value) if value.isdigit() else None
    except (subprocess.SubprocessError, OSError, ValueError):
        # Health was observed independently. Missing memory must not become zero.
        pass
    return result


def host_memory():
    try:
        values = {}
        for line in Path('/proc/meminfo').read_text().splitlines():
            key, value = line.split(':', 1)
            if key in ('MemTotal', 'MemAvailable'):
                values[key] = int(value.split()[0]) * 1024
        return dict(totalBytes=values['MemTotal'], availableBytes=values['MemAvailable'])
    except (OSError, KeyError, ValueError):
        return None


def collect(project):
    if not re.fullmatch(r'easypet-[a-z0-9][a-z0-9_-]{0,80}', project):
        raise ValueError('Expected an EasyPet Compose project')
    ids = docker('ps', '-aq', '--filter', 'label=com.docker.compose.project=' + project).split()
    inventory = parse_inventory(docker('inspect', '--format', FORMAT, *ids)) if ids else {}
    captured = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with ThreadPoolExecutor(max_workers=4) as executor:
        services = list(executor.map(lambda name: service_status(name, inventory.get(name)), SERVICES))
    return dict(schemaVersion=1, collectedAt=captured, hostMemory=host_memory(), services=services)


def publish(snapshot, target):
    target = Path(target)
    if target.name != 'status.json':
        raise ValueError('Output filename must be status.json')
    payload = json.dumps(snapshot, separators=(',', ':')) + '\n'
    if len(payload.encode()) > 65_536:
        raise ValueError('Snapshot too large')
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent,
                                         prefix='.status-', suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
        temporary.chmod(0o644)
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        publish(collect(args.project), args.output)
        print('EasyPet: status snapshot published (16 services).')
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        parser.exit(1, 'EasyPet: status collection failed (' + type(error).__name__
                    + '); previous snapshot will expire.\n')
