import os
import threading
import time
import json
import shutil
import tempfile
from backend.persistence import ensure_data_file, read_applications, write_applications

TEST_DIR = os.path.join(os.path.dirname(__file__), 'tmp_test_data')
TEST_FILE = os.path.join(TEST_DIR, 'applications_test.json')


def setup_module():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR, exist_ok=True)


def teardown_module():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)


def test_ensure_and_read_missing():
    # Ensure data file is created
    if os.path.exists(TEST_FILE):
        os.remove(TEST_FILE)
    ensure_data_file(TEST_FILE)
    assert os.path.exists(TEST_FILE)
    data = read_applications(TEST_FILE)
    assert isinstance(data, list)
    assert data == []


def test_write_and_read():
    apps = [{"id": "REF-1001", "name": "Alice"}]
    write_applications(TEST_FILE, apps)
    read = read_applications(TEST_FILE)
    assert isinstance(read, list)
    assert read == apps


def test_invalid_json_handling():
    # Write invalid JSON
    with open(TEST_FILE, 'w', encoding='utf-8') as f:
        f.write('{ this is invalid JSON')
    data = read_applications(TEST_FILE)
    assert data == []


def test_sequential_updates():
    write_applications(TEST_FILE, [])
    for i in range(5):
        apps = [{"id": f"REF-{1000+i}", "val": i}]
        write_applications(TEST_FILE, apps)
        read = read_applications(TEST_FILE)
        assert read == apps


def _concurrent_writer(path, payload, delay=0):
    if delay:
        time.sleep(delay)
    write_applications(path, payload)


def test_concurrent_writes():
    # Start multiple threads that write different payloads concurrently
    payloads = [ [{"id": f"REF-{2000+i}", "v": i}] for i in range(6) ]
    threads = []
    for i, p in enumerate(payloads):
        t = threading.Thread(target=_concurrent_writer, args=(TEST_FILE, p, i*0.01))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    # File should contain a valid JSON list (one of the payloads)
    final = read_applications(TEST_FILE)
    assert isinstance(final, list)
    assert len(final) == 1
    assert final in payloads
