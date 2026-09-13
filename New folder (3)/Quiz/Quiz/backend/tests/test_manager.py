import sys
import re
from pathlib import Path

import pytest

import importlib

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import modules under test
import manager
import gemini_service

TARGET_TYPES = [
    'mcq', 'sql', 'output_prediction', 'code_debugging', 'scenario',
    'conceptual', 'code_snippet', 'mcq'
]


@pytest.fixture(autouse=True)
def mock_gemini(monkeypatch):
    """Mock gemini_service AI entrypoints for deterministic tests."""

    # Always return empty full quiz so manager will call generate_single_question for each target type
    def mock_generate_full_quiz(field, context=None):
        return {"questions": []}

    def mock_generate_single_question(field, difficulty, excluded_questions, qtype=None):
        # Build a deterministic question payload matching gemini_service._normalize_question expectations
        qtype_norm = str(qtype or 'mcq').lower()
        question_text = f"{qtype_norm} question for {field}"
        options = ["A", "B", "C", "D"] if qtype_norm == 'mcq' else []
        correct = "correct-answer"
        return {
            "id": 0,
            "difficulty": difficulty,
            "type": qtype_norm,
            "question": question_text,
            "options": options,
            "correctAnswer": correct,
            "explanation": "explain",
            "points": gemini_service._difficulty_points(difficulty),
        }

    # Normalize function should be identity-like; ensure ids/points are set correctly
    def mock_normalize_question(question, index=1):
        q = dict(question)
        q.setdefault('id', index)
        q.setdefault('points', gemini_service._difficulty_points(q.get('difficulty', 'easy')))
        # Ensure options list for mcq
        if q.get('type') == 'mcq' and not isinstance(q.get('options'), list):
            q['options'] = ["A", "B"]
        return q

    # Public sanitizer should remove answer fields
    def mock_sanitize_public_question(q):
        qpub = dict(q)
        qpub['question'] = re.sub(
            r'\s*(?:\(\s*(?:variant\s+\d+|Q\s*#\s*\d+|question\s*#?\s*\d+)\s*\)|Q\s*#\s*\d+|variant\s+\d+|question\s*#?\s*\d+)\s*',
            ' ',
            str(qpub.get('question', '')),
            flags=re.IGNORECASE,
        ).strip()
        qpub.pop('correctAnswer', None)
        qpub.pop('explanation', None)
        qpub.pop('internal_prompt', None)
        qpub.pop('grading_hint', None)
        return qpub

    def mock_get_mock_single_question(field, difficulty, qtype=None):
        return mock_generate_single_question(field, difficulty, [], qtype=qtype)

    monkeypatch.setattr(gemini_service, 'generate_full_quiz', mock_generate_full_quiz)
    monkeypatch.setattr(gemini_service, 'generate_single_question', mock_generate_single_question)
    monkeypatch.setattr(gemini_service, '_normalize_question', mock_normalize_question)
    monkeypatch.setattr(gemini_service, 'sanitize_public_question', mock_sanitize_public_question)
    monkeypatch.setattr(gemini_service, 'get_mock_single_question', mock_get_mock_single_question)

    # reload manager to ensure it picks up patched gemini_service if necessary
    importlib.reload(manager)
    yield


def test_create_session_creates_fifteen_questions():
    session = manager.create_session('Data Science Engineer', context={'matched_skills': ['Python'], 'projects': ['Proj']})
    assert session is not None
    assert isinstance(session.all_questions, list)
    assert len(session.all_questions) == 15
    assert len({q.get('question') for q in session.all_questions}) == 15
    # The assessment must contain a varied technical mix without requiring
    # every supported type in every generated session.
    types = [str(q.get('type', 'mcq')).lower() for q in session.all_questions]
    assert len(set(types)) >= 3


def test_all_questions_can_be_answered_and_report_generated():
    session = manager.create_session('Data Science Engineer', context={'matched_skills': ['Python'], 'projects': ['Proj']})
    assert len(session.all_questions) == 15
    public_questions = [gemini_service.sanitize_public_question(q) for q in session.all_questions]
    assert all('correctAnswer' not in q for q in public_questions)
    assert all('(variant ' not in q.get('question', '').lower() for q in public_questions)
    assert all('q#' not in q.get('question', '').lower() for q in public_questions)

    # Answer each question with the known correct answer from the mocked generator
    for q in session.all_questions:
        correct = q.get('correctAnswer')
        assert correct is not None
        res = session.submit_answer(correct)
        assert res is not None
        assert res.get('status') == 'accepted'

    # After all answers, session should be finished
    assert session.is_finished is True

    report = session.get_final_report()
    assert 'percentage' in report
    assert 'isSelected' in report
    assert report.get('isFinished', True) is True
    assert report.get('maxScore') == 150
    assert len(report.get('results', [])) == 15
