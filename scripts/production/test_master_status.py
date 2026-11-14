import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess
import json

spec = importlib.util.spec_from_file_location('master_status', Path(__file__).with_name('master_status.py'))
master = importlib.util.module_from_spec(spec)
spec.loader.exec_module(master)


class MasterStatusTest(unittest.TestCase):
    def test_missing_is_not_healthy_or_zero_memory(self):
        row = master.service_status('auth-service', None)
        self.assertEqual('MISSING', row['status'])
        self.assertIsNone(row['memoryBytes'])

    def test_only_known_services_and_duplicate_rejected(self):
        row = 'auth-service|abc|running|healthy|2026-11-13T20:00:00Z|0|false|100'
        self.assertEqual(['auth-service'], list(master.parse_inventory(row + '\nsetoriza|a|b|c|d|0|false|1')))
        with self.assertRaises(ValueError):
            master.parse_inventory(row + '\n' + row)

    def test_paused_container_is_not_healthy(self):
        row = ['auth-service', 'abc', 'paused', 'healthy', '2026-11-13T20:00:00Z', '1', 'true', '100']
        with patch.object(master, 'docker') as docker:
            status = master.service_status('auth-service', row)
        self.assertEqual('STOPPED', status['status'])
        self.assertTrue(status['oomKilled'])
        docker.assert_not_called()

    def test_failed_metric_is_unknown_not_zero(self):
        row = ['auth-service', 'abc', 'running', 'healthy', '2026-11-13T20:00:00Z', '0', 'false', '100']
        with patch.object(master, 'docker', side_effect=subprocess.TimeoutExpired('docker', 10)):
            status = master.service_status('auth-service', row)
        self.assertEqual('HEALTHY', status['status'])
        self.assertIsNone(status['memoryBytes'])

    def test_absent_healthcheck_never_claims_healthy(self):
        row = ['frontend', 'abc', 'running', 'none', '2026-11-13T20:00:00Z', '0', 'false', '100']
        with patch.object(master, 'docker', return_value='40'):
            status = master.service_status('frontend', row)
        self.assertEqual('UNKNOWN', status['status'])
        self.assertEqual(40, status['memoryBytes'])

    def test_atomic_replacement_and_project_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'status.json'
            master.publish({'schemaVersion': 1}, target)
            master.publish({'schemaVersion': 2}, target)
            self.assertEqual(2, json.loads(target.read_text())['schemaVersion'])
            self.assertEqual(['status.json'], [file.name for file in Path(directory).iterdir()])
        with self.assertRaises(ValueError):
            master.collect('setoriza-homolog')


if __name__ == '__main__':
    unittest.main()
