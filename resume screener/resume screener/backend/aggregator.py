import os
import requests
from datetime import datetime, timezone
from typing import Tuple, Optional
from backend.persistence import read_applications, write_applications


def _parse_weight_env(key: str, default: float) -> float:
    v = os.environ.get(key)
    if v is None or v == "":
        return default
    try:
        return float(v)
    except Exception:
        raise ValueError(f"Environment variable {key} must be a numeric value")


def get_weights() -> dict:
    r1 = _parse_weight_env('ROUND1_WEIGHT', 0.40)
    r2 = _parse_weight_env('ROUND2_WEIGHT', 0.30)
    r3 = _parse_weight_env('ROUND3_WEIGHT', 0.30)
    total = r1 + r2 + r3
    # Accept totals close to 1.0 within a small epsilon
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"ROUND weights must sum to 1.0. Current total: {total}")
    if r1 < 0 or r2 < 0 or r3 < 0:
        raise ValueError("ROUND weights must be non-negative")
    return {'round1': r1, 'round2': r2, 'round3': r3}


def _normalize_score(raw: Optional[float]) -> Optional[float]:
    """Normalize a score to 0-100 scale.
    Rules:
    - None -> None
    - If 0 <= raw <= 1: treat as fraction and multiply by 100
    - If 1 < raw <= 100: accept as-is
    - Otherwise: raise ValueError
    """
    if raw is None:
        return None
    try:
        val = float(raw)
    except Exception:
        raise ValueError('Score must be numeric')
    if val < 0:
        raise ValueError('Score cannot be negative')
    if val <= 1.0:
        return val * 100.0
    if val <= 100.0:
        return val
    # Anything above 100 considered invalid
    raise ValueError('Score exceeds maximum expected value (100)')


def _fetch_interview_score(interview_api_base: str, session_id) -> Optional[float]:
    """Call interview service to fetch final assessment overall_score. Returns numeric score or None if not found."""
    try:
        url = f"{interview_api_base.rstrip('/')}/api/interview/final-score/{session_id}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            # Expect key overall_score or overallScore
            score = data.get('overall_score') or data.get('overallScore') or data.get('overall')
            if score is None:
                return None
            return float(score)
        else:
            # If interview service returns 400 (no answers) or 404, treat as missing
            return None
    except Exception:
        # On error contacting service, propagate as None to be handled by caller
        return None


def _recommendation_from_score(score: float) -> str:
    # Deterministic thresholds; configurable in future
    if score >= 80.0:
        return 'Strongly Recommended'
    if score >= 65.0:
        return 'Recommended'
    if score >= 50.0:
        return 'Consider'
    return 'Not Recommended'


def aggregate_candidate(candidate_id: str, data_file: str, interview_api_base: str) -> dict:
    """Aggregate scores for the given candidate id, persist final result into applications.json and return final payload.
    This function is idempotent: it overwrites the final_result field if present.
    """
    apps = read_applications(data_file)
    target = None
    for app in apps:
        if app.get('id') == candidate_id:
            target = app
            break
    if not target:
        raise KeyError('Candidate not found')

    # Read weights
    weights = get_weights()

    # Extract round1
    round1_raw = None
    analysis = target.get('analysis') or {}
    # Common keys: final_score, overallScore, score
    round1_raw = analysis.get('final_score') or analysis.get('overallScore') or analysis.get('score') or target.get('score')

    # Extract round2
    round2_raw = target.get('quiz_score') or (target.get('quiz_report_full', {}) or {}).get('percentage')

    # Extract round3 via interview_session_id
    interview_session_id = target.get('interview_session_id')
    round3_raw = None
    if interview_session_id is not None:
        round3_raw = _fetch_interview_score(interview_api_base, interview_session_id)

    # Validate existence
    missing = []
    if round1_raw is None:
        missing.append('round1')
    if round2_raw is None:
        missing.append('round2')
    if round3_raw is None:
        missing.append('round3')
    if missing:
        raise ValueError(f"Missing round results: {', '.join(missing)}")

    # Normalize
    r1 = _normalize_score(round1_raw)
    r2 = _normalize_score(round2_raw)
    r3 = _normalize_score(round3_raw)

    # Compute final score
    final = r1 * weights['round1'] + r2 * weights['round2'] + r3 * weights['round3']

    recommendation = _recommendation_from_score(final)

    final_payload = {
        'final_score': round(final, 2),
        'recommendation': recommendation,
        'round_scores': {
            'round1': round(r1, 2),
            'round2': round(r2, 2),
            'round3': round(r3, 2)
        },
        'weights': weights,
        'status': 'completed',
        'aggregated_at': datetime.now(timezone.utc).isoformat()
    }

    # Persist into applications.json under key final_result
    target['final_result'] = final_payload
    write_applications(data_file, apps)

    response = {
        'candidate_id': candidate_id,
        'round1_score': final_payload['round_scores']['round1'],
        'round2_score': final_payload['round_scores']['round2'],
        'round3_score': final_payload['round_scores']['round3'],
        'weights': weights,
        'final_score': final_payload['final_score'],
        'recommendation': final_payload['recommendation'],
        'status': final_payload['status']
    }

    return response
