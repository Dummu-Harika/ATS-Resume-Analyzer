import os
import threading
import time
import json
import shutil
import sys
import pathlib
# Make sure the project root (resume screener/resume screener) is on sys.path for imports
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from backend.persistence import ensure_data_file, read_applications, write_applications

TEST_DIR = os.path.join(os.path.dirname(__file__), 'tmp_test_data')
TEST_FILE = os.path.join(TEST_DIR, 'applications_test.json')


def setup():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR, exist_ok=True)


def teardown():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)


def run_all():
    print('Running persistence tests...')
    setup()
    try:
        # Test ensure and read missing
        if os.path.exists(TEST_FILE):
            os.remove(TEST_FILE)
        ensure_data_file(TEST_FILE)
        assert os.path.exists(TEST_FILE), 'ensure_data_file did not create file'
        data = read_applications(TEST_FILE)
        assert isinstance(data, list) and data == [], 'read_applications on new file should return []'
        print('Test ensure_and_read_missing: PASS')

        # Test write and read
        apps = [{"id": "REF-1001", "name": "Alice"}]
        write_applications(TEST_FILE, apps)
        read = read_applications(TEST_FILE)
        assert read == apps, 'write_applications/read_applications mismatch'
        print('Test write_and_read: PASS')

        # Test invalid JSON handling
        with open(TEST_FILE, 'w', encoding='utf-8') as f:
            f.write('{ invalid')
        data = read_applications(TEST_FILE)
        assert data == [], 'read_applications should return [] for invalid JSON'
        print('Test invalid_json_handling: PASS')

        # Test sequential updates
        write_applications(TEST_FILE, [])
        for i in range(5):
            apps = [{"id": f"REF-{1000+i}", "val": i}]
            write_applications(TEST_FILE, apps)
            read = read_applications(TEST_FILE)
            assert read == apps
        print('Test sequential_updates: PASS')

        # Test concurrent writes
        def writer(path, payload, delay=0):
            if delay:
                time.sleep(delay)
            write_applications(path, payload)

        payloads = [ [{"id": f"REF-{2000+i}", "v": i}] for i in range(6) ]
        threads = []
        for i, p in enumerate(payloads):
            t = threading.Thread(target=writer, args=(TEST_FILE, p, i*0.01))
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
        final = read_applications(TEST_FILE)
        assert isinstance(final, list) and len(final) == 1 and final in payloads, 'concurrent write resulted in invalid content'
        print('Test concurrent_writes: PASS')

        print('\nALL persistence tests PASSED')
        return 0
    except AssertionError as ae:
        print('AssertionError:', ae)
        return 2
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 3
    finally:
        teardown()

if __name__ == '__main__':
    exit(run_all())
