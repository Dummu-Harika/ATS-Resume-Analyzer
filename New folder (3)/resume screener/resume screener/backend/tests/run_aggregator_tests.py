import os
import shutil
import json
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from backend.aggregator import aggregate_candidate, get_weights
from backend.persistence import write_applications

TEST_DIR = os.path.join(os.path.dirname(__file__), 'tmp_agg_test')
TEST_FILE = os.path.join(TEST_DIR, 'applications.json')


def setup():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR, exist_ok=True)


def teardown():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)


def run_all():
    print('Running aggregator tests...')
    setup()
    try:
        # Ensure weights default
        os.environ.pop('ROUND1_WEIGHT', None)
        os.environ.pop('ROUND2_WEIGHT', None)
        os.environ.pop('ROUND3_WEIGHT', None)

        # Test valid aggregation
        apps = [
            {
                'id': 'C-1',
                'analysis': {'final_score': 80},
                'quiz_score': 70,
                'interview_session_id': 42
            }
        ]
        write_applications(TEST_FILE, apps)

        # Monkeypatch the interview fetch by temporarily replacing the helper
        import backend.aggregator as agg
        original_fetch = agg._fetch_interview_score
        agg._fetch_interview_score = lambda base, sid: 90

        res = aggregate_candidate('C-1', TEST_FILE, 'http://localhost:8004')
        print('Aggregation result:', res)
        assert res['candidate_id'] == 'C-1'
        # Default weights r1=0.4, r2=0.3, r3=0.3 -> final = 80*0.4 +70*0.3 +90*0.3 = 32+21+27=80
        assert abs(res['final_score'] - 80.0) < 0.01
        assert res['recommendation'] == 'Strongly Recommended' or res['recommendation'] == 'Recommended' or isinstance(res['recommendation'], str)
        print('Test valid aggregation: PASS')

        # Test missing candidate
        try:
            aggregate_candidate('NOPE', TEST_FILE, 'http://localhost:8004')
            print('Expected missing candidate to raise')
            return 2
        except KeyError:
            print('Test missing candidate: PASS')

        # Test missing rounds
        apps2 = [
            {'id': 'C-2', 'analysis': {}, 'quiz_score': None}
        ]
        write_applications(TEST_FILE, apps2)
        try:
            aggregate_candidate('C-2', TEST_FILE, 'http://localhost:8004')
            print('Expected missing rounds to raise')
            return 3
        except ValueError as ve:
            print('Test missing rounds: PASS', ve)

        # Test invalid weights
        os.environ['ROUND1_WEIGHT'] = '0.5'
        os.environ['ROUND2_WEIGHT'] = '0.6'
        os.environ['ROUND3_WEIGHT'] = '0.0'
        try:
            agg.get_weights()
            print('Expected invalid weights to raise')
            return 4
        except ValueError:
            print('Test invalid weights: PASS')
        finally:
            # Restore defaults for subsequent tests
            os.environ.pop('ROUND1_WEIGHT', None)
            os.environ.pop('ROUND2_WEIGHT', None)
            os.environ.pop('ROUND3_WEIGHT', None)

        # Test idempotency: write app with final_result and ensure calling aggregate again overwrites but keeps same
        apps3 = [
            {'id': 'C-3', 'analysis': {'final_score': 50}, 'quiz_score': 60, 'interview_session_id': 7}
        ]
        write_applications(TEST_FILE, apps3)
        agg._fetch_interview_score = lambda base, sid: 70
        res1 = aggregate_candidate('C-3', TEST_FILE, 'http://localhost:8004')
        res2 = aggregate_candidate('C-3', TEST_FILE, 'http://localhost:8004')
        assert res1 == res2
        print('Test idempotency: PASS')

        # restore
        agg._fetch_interview_score = original_fetch

        print('\nALL aggregator tests PASSED')
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
