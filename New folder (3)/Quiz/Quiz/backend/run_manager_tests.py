import sys
import pathlib
import json
import random
import os

# Ensure project root importability
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[0]))
import manager

EXPECTED_TYPES = {'mcq', 'sql', 'output_prediction', 'code_debugging', 'scenario', 'conceptual', 'code_snippet'}


def run_all():
    print('Running Round 2 manager tests...')
    try:
        s = manager.create_session('DataScienceEngineer', context={'matched_skills': ['Python', 'SQL'], 'projects': ['Test Project']})
        print('session_id=', s.session_id)
        nq = len(s.all_questions)
        print('num_questions=', nq)
        if nq != 10:
            print('FAIL: expected 10 questions, got', nq)
            return 2

        types = [str(q.get('type', 'mcq')).lower() for q in s.all_questions]
        print('types=', types)
        types_set = set(types)

        # Check that expected types are present (subset)
        missing = EXPECTED_TYPES - types_set
        if missing:
            print('FAIL: missing expected types:', missing)
            return 3

        # Test answer submission across all questions
        answers = []
        for q in s.all_questions:
            ans = q.get('correctAnswer')
            if ans is None:
                # submit a placeholder answer if correctAnswer not present
                ans = '(Candidate Skipped)'
            ret = s.submit_answer(ans)
            # ret may be None if already finished; ensure accepted structure when present
            if ret is None:
                print('FAIL: submit_answer returned None unexpectedly')
                return 4
            answers.append(ans)

        report = s.get_final_report()
        print('report keys:', list(report.keys()))
        if 'percentage' not in report:
            print('FAIL: report missing percentage')
            return 5

        # Ensure results length equals number of answered questions (history)
        if isinstance(report.get('results'), list):
            if len(report['results']) != len(s.history):
                print('FAIL: report.results length mismatch', len(report.get('results')), len(s.history))
                return 6

        print('All Round 2 manager tests PASSED')
        return 0

    except AssertionError as ae:
        print('AssertionError:', ae)
        return 2
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 3


if __name__ == '__main__':
    sys.exit(run_all())
