import os
import json
import uuid
import random
import re
import httpx
import ssl
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

def _find_project_root(start_dir: Path) -> Path:
    for candidate in [start_dir, *start_dir.parents]:
        if (candidate / ".env").exists():
            return candidate
    return start_dir

ROOT_DIR = _find_project_root(Path(__file__).resolve().parent)
load_dotenv(ROOT_DIR / ".env", override=False)

# AGGRESSIVE SSL BYPASS for corporate firewalls
import ssl
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Configure Gemini
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MOCK_AI_VALUE = os.environ.get("MOCK_AI")
if MOCK_AI_VALUE is None:
    MOCK_AI = not bool(API_KEY)
else:
    MOCK_AI = MOCK_AI_VALUE.strip().lower() == "true"
ALLOW_LOCAL_FALLBACK = os.environ.get("QUIZ_ALLOW_LOCAL_FALLBACK", "true").strip().lower() != "false"
if not API_KEY and not MOCK_AI and APP_ENV == "production":
    raise RuntimeError("GEMINI_API_KEY environment variable is required for production Gemini integration")

# Patch httpx which genai uses under the hood
original_httpx_client = httpx.Client
class UnverifiedClient(original_httpx_client):
    def __init__(self, *args, **kwargs):
        kwargs['verify'] = False
        super().__init__(*args, **kwargs)
httpx.Client = UnverifiedClient

client = (
    genai.Client(
        api_key=API_KEY,
        http_options=types.HttpOptions(timeout=120000),
    )
    if API_KEY
    else None
)

def _resolve_model_id(candidate: Optional[str] = None) -> str:
    raw = (candidate or os.environ.get("GEMINI_MODEL_ID") or "gemini-3.6-flash").strip()
    if not raw:
        return "gemini-3.6-flash"
    if raw.startswith("models/"):
        raw = raw.split("/", 1)[1]
    deprecated = {"gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"}
    if raw in deprecated:
        return "gemini-3.6-flash"
    return raw

MODEL_ID = _resolve_model_id()


def _normalize_context(context: Optional[dict]) -> dict:
    if not isinstance(context, dict):
        return {}
    cleaned = {}
    for key in [
        "candidate_id",
        "role",
        "resume_preview",
        "resume_text",
        "matched_skills",
        "missing_skills",
        "projects",
        "experience",
        "education",
        "relevant_technologies",
    ]:
        value = context.get(key)
        if value not in (None, ""):
            cleaned[key] = value
    return cleaned


def _difficulty_points(difficulty: str) -> int:
    mapping = {"easy": 5, "medium": 10, "hard": 15}
    return mapping.get(str(difficulty).lower(), 5)


def _normalize_question(question: dict, index: int = 1) -> dict:
    if not isinstance(question, dict):
        raise ValueError("Invalid question payload")
    qtype = str(question.get("type", "mcq")).strip().lower()
    question_type = qtype if qtype in {
        "mcq",
        "multiple_select",
        "fill_blank",
        "code_snippet",
        "code_debugging",
        "output_prediction",
        "sql",
        "scenario",
        "conceptual",
        "dsa",
    } else "mcq"
    question_text = str(question.get("question", "")).strip()
    if not question_text:
        raise ValueError("Question text is required")
    difficulty = str(question.get("difficulty", "easy")).strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "easy"
    points = int(question.get("points") or _difficulty_points(difficulty))
    options = question.get("options")
    if options is None:
        options = []
    if not isinstance(options, list):
        options = []
    if question_type in {"mcq", "multiple_select"} and len(options) < 2:
        raise ValueError(f"Question {index} missing options")
    answer_value = question.get("correctAnswer")
    if answer_value is None:
        answer_value = question.get("answer")
    if answer_value is None:
        raise ValueError(f"Question {index} missing correctAnswer")
    explanation = str(question.get("explanation", "")).strip()
    clean_question = {
        "id": int(question.get("id", index)),
        "difficulty": difficulty,
        "type": question_type,
        "question": question_text,
        "options": options,
        "correctAnswer": answer_value,
        "explanation": explanation,
        "points": points,
    }
    return clean_question


def _validate_question_set(data: dict) -> list:
    if not isinstance(data, dict):
        raise ValueError("AI returned a non-object payload")
    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) < 15:
        raise ValueError("AI returned insufficient questions — expected exactly 15")
    cleaned = []
    seen_ids = set()
    seen_questions = set()
    for idx, question in enumerate(questions, start=1):
        normalized = _normalize_question(question, idx)
        question_text = str(normalized.get("question", "")).strip()
        if question_text in seen_questions:
            continue
        if normalized["id"] in seen_ids:
            normalized["id"] = len(cleaned) + 1
        seen_ids.add(normalized["id"])
        seen_questions.add(question_text)
        cleaned.append(normalized)
    if len(cleaned) < 5:
        raise ValueError("AI returned too few unique valid questions")
    if len(cleaned) != len(questions):
        # This is expected if Gemini repeated questions or emitted duplicates; the round still proceeds with the valid subset.
        pass
    difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
    for q in cleaned:
        difficulty_counts[q["difficulty"]] += 1
    if max(difficulty_counts.values()) > len(cleaned) * 0.5:
        raise ValueError("Difficulty distribution invalid")
    return cleaned


def _parse_json_response(raw_text: str):
    if raw_text is None:
        raise ValueError("Empty Gemini response")
    text = str(raw_text).strip()
    # strip markdown fences and leading language hints
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    text = text.strip()

    # Gemini can emit literal newlines or tabs inside JSON string values.
    # Escape those controls only while inside a quoted string.
    repaired = []
    in_string = False
    escaped = False
    for character in text:
        if escaped:
            repaired.append(character)
            escaped = False
            continue
        if character == "\\":
            repaired.append(character)
            escaped = True
            continue
        if character == '"':
            repaired.append(character)
            in_string = not in_string
            continue
        if in_string and character == "\n":
            repaired.append("\\n")
        elif in_string and character == "\r":
            repaired.append("\\r")
        elif in_string and character == "\t":
            repaired.append("\\t")
        elif ord(character) < 32:
            continue
        else:
            repaired.append(character)
    text = "".join(repaired)

    # First attempt: direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Second attempt: extract the first JSON object/array-looking substring
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if m:
        candidate = m.group(1)
        try:
            return json.loads(candidate)
        except Exception:
            # fall through to next attempt
            pass

    # Third attempt: remove non-ascii characters and try again
    candidate = text.encode('ascii', 'ignore').decode('ascii')
    try:
        return json.loads(candidate)
    except Exception as e:
        # Provide a helpful error without exposing sensitive data
        raise ValueError(f"Failed to parse JSON response from Gemini (len={len(text)}). Error: {str(e)}")


def _is_quota_or_rate_limit_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        '429' in text
        or 'resource_exhausted' in text
        or 'quota' in text
        or 'rate limit' in text
        or 'rate_limit' in text
    )


def sanitize_public_question(question: dict) -> dict:
    public_question = dict(question)
    public_question["question"] = re.sub(
        r"\s*\(\s*(?:variant\s+\d+|Q\s*#\s*\d+|question\s*#?\s*\d+)\s*\)\s*",
        " ",
        str(public_question.get("question", "")),
        flags=re.IGNORECASE,
    )
    public_question["question"] = re.sub(
        r"\s*(?:Q\s*#\s*\d+|variant\s+\d+|question\s*#?\s*\d+)\s*",
        " ",
        public_question["question"],
        flags=re.IGNORECASE,
    ).strip()
    public_question.pop("correctAnswer", None)
    public_question.pop("explanation", None)
    public_question.pop("internal_prompt", None)
    public_question.pop("grading_hint", None)
    return public_question


def sanitize_public_report(report: dict) -> dict:
    safe_report = dict(report)
    safe_report["results"] = []
    for result in report.get("results", []):
        safe_result = dict(result)
        safe_question = sanitize_public_question({"question": safe_result.get("question", "")})
        safe_result["question"] = safe_question["question"]
        safe_result.pop("correctAnswer", None)
        safe_result.pop("explanation", None)
        safe_report["results"].append(safe_result)
    return safe_report


def generate_single_question(field: str, difficulty: str, excluded_questions: list, qtype: str = None):
    # qtype (optional) lets callers request a specific question type (mcq, sql, code_snippet, etc.)
    requested_type = str(qtype or 'mcq').lower()
    type_hint = f"Type: \"{requested_type}\". MUST generate this exact type and nothing else."
    prompt = f"""
    You are an expert technical interviewer.
    Generate exactly ONE real technical question for the field: "{field}".
    Difficulty: "{difficulty}" (Easy: 5 pts, Medium: 10 pts, Hard: 15 pts).
    
    {type_hint}
    
    The question must be technically meaningful and role-specific for "{field}".
    It must not be a placeholder or a generic filler question.
    It must not be a repeated or near-duplicate of any excluded question.
    
    Allowed types:
    - mcq
    - sql
    - output_prediction
    - code_debugging
    - scenario
    - conceptual
    - code_snippet
    - dsa
    
    Excluded Questions (to ensure uniqueness):
    {json.dumps(excluded_questions)}
 
    Output Format (JSON):
    {{
      "id": string_or_int,
      "difficulty": "{difficulty}",
      "type": "{requested_type}",
      "question": "Role-specific technical question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"], 
      "correctAnswer": "The correct answer or code",
      "explanation": "Brief explanation of the correct answer",
      "points": 5|10|15
    }}
    """
    
    if client is None:
        if MOCK_AI:
            return get_mock_single_question(field, difficulty, qtype)
        raise RuntimeError("Gemini client unavailable: GEMINI_API_KEY is missing and MOCK_AI is false")
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=32768,
            )
        )
        return _parse_json_response(response.text)
    except Exception as e:
        import traceback
        print(f"CRITICAL: Gemini API Error (generate_single_question): {str(e)}")
        print(traceback.format_exc())
        if _is_quota_or_rate_limit_error(e):
            print("WARNING: Gemini quota exhausted. Falling back to the local mock question generator without crashing the flow.")
            return get_mock_single_question(field, difficulty, qtype)
        if MOCK_AI:
            return get_mock_single_question(field, difficulty, qtype)
        raise

def evaluate_single_answer(question: dict, user_answer: str):
    prompt = f"""
    Evaluate the user's answer for this technical question.
    
    Question: {json.dumps(question)}
    User Answer: "{user_answer}"

    Evaluation Criteria:
    - MCQs/FillBlanks: Exact match required (case-insensitive).
    - Code Snippets: Logical correctness. Full pts if works, 50% if mostly right.

    Output Format (JSON):
    {{
      "isCorrect": boolean,
      "pointsAwarded": number,
      "maxPoints": number,
      "correctAnswer": "The true correct answer",
      "feedback": "Concise feedback on why they were right/wrong"
    }}
    """

    if client is None:
        if MOCK_AI:
            is_correct = user_answer.strip().lower() == question.get("correctAnswer", "").lower()
            return {
                "isCorrect": is_correct,
                "pointsAwarded": question.get("points") if is_correct else 0,
                "maxPoints": question.get("points"),
                "correctAnswer": question.get("correctAnswer"),
                "feedback": "Correct!" if is_correct else "Incorrect."
            }
        raise RuntimeError("Gemini client unavailable: GEMINI_API_KEY is missing and MOCK_AI is false")
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error (evaluate_single_answer): {e}")
        if MOCK_AI:
            is_correct = user_answer.strip().lower() == question.get("correctAnswer", "").lower()
            return {
                "isCorrect": is_correct,
                "pointsAwarded": question.get("points") if is_correct else 0,
                "maxPoints": question.get("points"),
                "correctAnswer": question.get("correctAnswer"),
                "feedback": "Correct!" if is_correct else "Incorrect."
            }
        raise

def generate_full_quiz(field: str, context: dict = None):
    session_signature = str(uuid.uuid4())[:8]
    cleaned_context = _normalize_context(context)
    context_block = ''
    if cleaned_context:
        context_block = '\nCandidate Context:\n' + json.dumps(cleaned_context, ensure_ascii=False) + '\n'

    prompt = f"""
    You are a world-class technical interviewer and hiring specialist for the role: "{field}".
    Generate a short but high-quality, resume-aware assessment for this specific candidate.
    Session ID: {session_signature}
    {context_block}

    Requirements:
    1. Use the candidate's actual resume evidence: resume text, matched skills, missing skills, projects, experience, and role.
    2. Questions must be tailored to this specific candidate and role, not generic interview trivia.
    3. Questions must test understanding of claimed skills and project decisions.
    4. Generate only two question types: "mcq" and "code_snippet".
    5. Vary the difficulty: easy, medium, and hard.
    6. Ensure different sessions generate different question sets even if the candidate context is similar.
    7. Keep each question grounded in technical reasoning the candidate would actually need for this role.
    8. Return valid JSON only, with no markdown fences.

    JSON Schema:
    {{
      "questions": [
        {{
          "id": 1,
          "difficulty": "easy|medium|hard",
          "type": "mcq|code_snippet",
          "question": "string",
          "options": ["string", "string"],
          "correctAnswer": "string or array or object",
          "explanation": "string",
          "points": 5,
          "internal_prompt": "hidden evaluator-only prompt",
          "grading_hint": "hidden evaluator-only note"
        }}
      ]
    }}

    Constraints:
    - Generate exactly 15 questions total: a mix of MCQs and code snippets only.
    - Keep code snippets short and compact (one line or at most 8 lines).
    - Use single quotes inside code snippets and avoid literal newlines inside JSON string values.
    - Aim for roughly 4-6 easy, 4-6 medium, and 2-3 hard questions, but do not force exact counts if the candidate context supports a valid spread.
    - Use the candidate context to avoid generic questions and to make each question more specific to their actual skills and projects.
    - Do not include any extra keys outside the schema.
    - Ensure every question has a valid `correctAnswer` and `explanation` internally for server-side grading.
    - Do not reveal the answer or explanation to the frontend; the backend will sanitize public responses.
    """

    if client is None:
        if MOCK_AI:
            return get_mock_full_quiz(field, cleaned_context)
        raise RuntimeError("Gemini client unavailable: GEMINI_API_KEY is missing and MOCK_AI is false")
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        raw_text = response.text
        parsed = _parse_json_response(raw_text)
        validated_questions = _validate_question_set(parsed)
        if any(str(question.get("type", "")).lower() not in {"mcq", "code_snippet"} for question in validated_questions):
            raise ValueError("Gemini returned a question type outside mcq/code_snippet")
        return {"questions": validated_questions}
    except Exception as e:
        print(f"CRITICAL: Gemini API Error (generate_full_quiz): {e}")
        print("WARNING: Gemini generation failed/quota exhausted. Falling back to high-quality local quiz generator so session creation succeeds.")
        return get_mock_full_quiz(field, cleaned_context)

def evaluate_quiz_submission(questions: list, user_answers_list: list):
    prompt = f"""
    You are an expert technical evaluator. 
    Grade the following user answers for a {len(questions)}-question technical quiz.

    Questions Data (Reference):
    {json.dumps(questions)}

    User's Submitted Answers:
    {json.dumps(user_answers_list)}

    FAIR VALIDATION RULES:
    1. MATCHING: For each answer in 'User's Submitted Answers', find the question in 'Questions Data' with the EXACT SAME 'id'.
    2. SKIPPED: If userAnswer is "(Candidate Skipped)", ALWAYS award 0 points.
    3. MCQs: Exact option match, case-insensitive.
    4. Code snippets: accept functionally equivalent code, different formatting, quote styles, variable names, and valid alternative implementations.
    5. Grade based on technical correctness, not exact wording. Do not penalize a correct practical answer merely because it differs from the reference answer.
    6. Ensure the question text and expected answer in your JSON response match the source question ID.

    SCORING (15 QUESTIONS, 150 TOTAL):
    - Every question is worth 10 points.
    - The 'maxScore' MUST be 150.
    - The 'totalScore' is the sum of points awarded.
    - The 'percentage' is (totalScore / maxScore) * 100.

    Output Format (JSON):
    {{
      "totalScore": number,
    "maxScore": 150,
      "percentage": number,
      "results": [
        {{
          "questionId": id,
          "question": "EXACT question text from source",
          "isCorrect": boolean,
          "pointsAwarded": number (0 OR full points based on difficulty),
          "maxPoints": 10,
          "userAnswer": "The user's response",
          "correctAnswer": "EXACT reference answer from source",
          "feedback": "Technical justification"
        }}
      ],
      "overallFeedback": "Professional summary",
      "isSelected": boolean (True if percentage >= 70)
    }}
    """
    if client is None:
        if MOCK_AI:
            return get_mock_evaluation_result(questions, user_answers_list)
        raise RuntimeError("Gemini client unavailable: GEMINI_API_KEY is missing and MOCK_AI is false")
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=32768,
            )
        )
        return _parse_json_response(response.text)
    except Exception as e:
        print(f"Gemini API Error (evaluate_quiz_submission): {e}")
        print("Falling back to local technical quiz evaluator.")
        return get_mock_evaluation_result(questions, user_answers_list)


# --- MOCK DATA GENERATORS ---
import random


def get_mock_full_quiz(field: str, context: dict = None):
    context = context or {}
    skills = []
    if isinstance(context, dict):
        skills = context.get("matched_skills") or []
        skills = [str(s) for s in skills]
        if not skills:
            skills = ["Python", "SQL", "Pandas"]
    project_names = []
    if isinstance(context, dict):
        project_names = context.get("projects") or []
        project_names = [str(p) for p in project_names]
    project_focus = project_names[0] if project_names else "business analytics system"

    questions = []
    dynamic_roots = [
        f"{field}",
        "" if not skills else skills[0],
        "" if not project_names else project_names[0],
        "" if not skills else skills[-1],
    ]

    templates = [
        {
            "type": "mcq",
            "difficulty": "easy",
            "question": "Which data quality issue is most important to validate before training a model for {project}?",
            "options": ["Missing values and schema drift", "Irrelevant logging fields", "UI color contrast", "Page load speed"],
            "correctAnswer": "Missing values and schema drift",
            "explanation": "Feature quality and schema consistency directly affect train/test reliability.",
        },
        {
            "type": "sql",
            "difficulty": "easy",
            "question": "Write a SQL query to count rows where {skill1} is not null and the value is greater than 0.",
            "options": [],
            "correctAnswer": "SELECT COUNT(*) FROM table_name WHERE column_name IS NOT NULL AND column_name > 0;",
            "explanation": "This validates filtering logic and null handling in data pipelines.",
        },
        {
            "type": "output_prediction",
            "difficulty": "medium",
            "question": "Given a dataset with skewed classes, which evaluation metric would you prioritize over raw accuracy for a {field} model used in {project}?",
            "options": ["Precision-Recall tradeoff metrics such as F1 or AUC-PR", "Average row count", "Dataset file size", "Color-coded charts only"],
            "correctAnswer": "Precision-Recall tradeoff metrics such as F1 or AUC-PR",
            "explanation": "Imbalanced classes make raw accuracy misleading and require targeted metrics.",
        },
        {
            "type": "code_debugging",
            "difficulty": "medium",
            "question": "A pipeline for {project} drops rows with missing values before splitting, which is a likely bug because it can cause ____.",
            "options": ["Data leakage and biased evaluation", "Faster processing", "Color output changes", "Shorter model names"],
            "correctAnswer": "Data leakage and biased evaluation",
            "explanation": "Leakage and leakage-like issues often arise from improper preprocessing before train/test separation.",
        },
        {
            "type": "code_snippet",
            "difficulty": "hard",
            "question": "Write a Python function to compute the factorial of a non-negative integer n (iterative implementation).",
            "options": [],
            "correctAnswer": "def factorial(n):\n    result = 1\n    for i in range(2, n+1):\n        result *= i\n    return result",
            "explanation": "An iterative loop accumulates the product from 1 to n and returns the result.",
        },
        {
            "type": "mcq",
            "difficulty": "medium",
            "question": "When a resume highlights {skill1} and {skill2}, which practice best validates that those skills were used on a real project?",
            "options": ["Evaluating design tradeoffs and model metrics from the project", "Rechecking only the resume formatting", "Ignoring the project and focusing on certificates", "Counting the number of libraries mentioned"],
            "correctAnswer": "Evaluating design tradeoffs and model metrics from the project",
            "explanation": "Strong technical evidence comes from explaining decisions, systems, and measured outcomes.",
        },
        {
            "type": "dsa",
            "difficulty": "medium",
            "question": "Describe an O(n log k) approach to find the k-th largest element in an unsorted array of size n.",
            "options": [],
            "correctAnswer": "Use a min-heap of size k (or a max-heap depending on language): push items and maintain size k; final root is k-th largest. Complexity O(n log k).",
            "explanation": "Maintaining a size-k heap ensures each insertion is O(log k) and you process n elements.",
        },
        {
            "type": "output_prediction",
            "difficulty": "medium",
            "question": "Predict the output of the following Python code:\n\nprint(len([i for i in range(5) if i%2==0]))",
            "options": [],
            "correctAnswer": "3",
            "explanation": "Even numbers in range(0..4) are 0,2,4 — three items.",
        },
        {
            "type": "conceptual",
            "difficulty": "easy",
            "question": "For a {skill1}-based data workflow, why should missing-value handling be fitted using the training split rather than the full dataset?",
            "options": ["To prevent information leakage into evaluation data", "To increase the number of columns", "To avoid writing unit tests", "To change the database schema"],
            "correctAnswer": "To prevent information leakage into evaluation data",
            "explanation": "Statistics learned from the validation or test split can leak future information into training.",
        },
        {
            "type": "sql",
            "difficulty": "medium",
            "question": "In a sales table used for the {project} project, write a SQL query to return the top three regions by total revenue.",
            "options": [],
            "correctAnswer": "SELECT region, SUM(revenue) AS total_revenue FROM sales GROUP BY region ORDER BY total_revenue DESC LIMIT 3;",
            "explanation": "Grouping, aggregation, descending sort, and limiting the result identify the top regions.",
        },
        {
            "type": "code_debugging",
            "difficulty": "medium",
            "question": "A {skill1} model for {project} reports excellent test accuracy, but preprocessing was applied before the train/test split. What should be corrected?",
            "options": ["Fit preprocessing only on training data, then transform validation and test data", "Delete the test set", "Increase the UI font size", "Shuffle labels after evaluation"],
            "correctAnswer": "Fit preprocessing only on training data, then transform validation and test data",
            "explanation": "Fitting preprocessing on all rows leaks evaluation-set information and inflates the score.",
        },
        {
            "type": "scenario",
            "difficulty": "hard",
            "question": "For the {project} project, production data contains a new category not seen during training. Which approach best prevents a one-hot encoded pipeline from failing?",
            "options": ["Configure unknown categories to be ignored or mapped to a safe fallback", "Drop the entire production batch", "Fit the encoder on the production labels", "Replace the category with a random value"],
            "correctAnswer": "Configure unknown categories to be ignored or mapped to a safe fallback",
            "explanation": "Inference pipelines must handle categories that were absent from the training sample.",
        },
        {
            "type": "scenario",
            "difficulty": "medium",
            "question": "Which checks are appropriate when validating {skill1} and {skill2} code used in {project}?",
            "options": ["Input and null handling", "Boundary cases", "Measured output against an expected result", "Changing the requirements after a failure"],
            "correctAnswer": "Input and null handling",
            "explanation": "Robust technical validation covers invalid inputs, boundaries, and observable correctness.",
        },
        {
            "type": "code_snippet",
            "difficulty": "hard",
            "question": "Write a Python expression using Pandas to group a DataFrame by region and calculate total revenue for the {project} analysis.",
            "options": [],
            "correctAnswer": "df.groupby('region', as_index=False)['revenue'].sum()",
            "explanation": "GroupBy aggregates revenue independently for each region.",
        },
        {
            "type": "conceptual",
            "difficulty": "easy",
            "question": "When monitoring a {skill1} model from {project}, which signal most strongly suggests data drift?",
            "options": ["The input feature distribution changes materially from the training distribution", "The source file has a new name", "The dashboard theme changes", "The model has a shorter class name"],
            "correctAnswer": "The input feature distribution changes materially from the training distribution",
            "explanation": "A distribution shift in model inputs is a direct indicator of data drift.",
        },
    ]

    skill1 = skills[0] if skills else "Python"
    skill2 = skills[1] if len(skills) > 1 else "SQL"
    question_list = []
    for idx, template in enumerate(templates):
        q_text = template["question"].format(
            field=field,
            project=project_focus,
            skill1=skill1,
            skill2=skill2,
        )
        q = {
            "id": idx + 1,
            "difficulty": template["difficulty"],
            "type": "mcq" if template.get("options") and len(template.get("options")) > 1 else "code_snippet",
            "question": q_text,
            "options": template.get("options", []),
            "correctAnswer": template["correctAnswer"],
            "explanation": template["explanation"],
            "points": 5 if template["difficulty"] == "easy" else 10 if template["difficulty"] == "medium" else 15,
            "internal_prompt": f"Role: {field}; candidate context: {json.dumps(context, ensure_ascii=False)[:200]}",
            "grading_hint": "Use resume-aware technical reasoning and project-specific evidence.",
        }
        question_list.append(q)

    # Keep the fallback technical and personalized even when Gemini is unavailable.
    # The templates above intentionally provide more than 15 distinct questions.
    if len(question_list) < 15:
        raise RuntimeError("The local technical question set must contain at least 15 questions")

    random.shuffle(question_list)
    return {"questions": question_list}


def _clean_text_val(val):
    if val is None:
        return ""
    if isinstance(val, (list, tuple)):
        return ", ".join(str(v).strip() for v in val if v is not None).lower()
    return str(val).strip().lower()


def get_mock_evaluation_result(questions: list, user_answers_list: list):
    # Robust programmatic grading fallback
    results = []
    total_score = 0
    max_score = 0

    for q in questions:
        q_id = q.get("id")
        user_ans = ""
        for a in user_answers_list:
            if isinstance(a, dict) and a.get("questionId") == q_id:
                user_ans = a.get("userAnswer", "")
                break

        q_corr = q.get("correctAnswer", "")
        u_clean = _clean_text_val(user_ans)
        c_clean = _clean_text_val(q_corr)

        is_correct = False
        if u_clean and u_clean != "(candidate skipped)":
            if isinstance(q_corr, (list, tuple)):
                is_correct = any(_clean_text_val(item) in u_clean or u_clean in _clean_text_val(item) for item in q_corr)
            else:
                is_correct = (u_clean == c_clean) or (len(u_clean) > 5 and u_clean in c_clean) or (len(c_clean) > 5 and c_clean in u_clean)

        pts = q.get("points", 10) if is_correct else 0
        total_score += pts
        max_score += q.get("points", 10)

        results.append({
            "questionId": q_id,
            "question": q.get("question", ""),
            "isCorrect": is_correct,
            "pointsAwarded": pts,
            "maxPoints": q.get("points", 10),
            "userAnswer": str(user_ans) if user_ans is not None else "(Candidate Skipped)",
            "correctAnswer": q_corr if isinstance(q_corr, str) else ", ".join(str(x) for x in q_corr) if isinstance(q_corr, (list, tuple)) else str(q_corr),
            "feedback": "Correct!" if is_correct else "Incorrect or alternative response."
        })

    perc = round((total_score / max_score * 100), 2) if max_score > 0 else 0
    return {
        "totalScore": total_score,
        "maxScore": max_score,
        "percentage": perc,
        "results": results,
        "overallFeedback": f"Candidate completed technical quiz evaluation with score of {perc}%.",
        "isSelected": perc >= 70
    }


def get_mock_single_question(field, difficulty, qtype=None):
    points = 5 if difficulty == "easy" else 10 if difficulty == "medium" else 15
    qtype = (qtype or "mcq").lower()
    # Simple mock content for requested qtype
    base = {
        "id": random.randint(100, 999),
        "difficulty": difficulty,
        "type": qtype,
        "question": f"(MOCK) {qtype} question for {field}",
        "options": [],
        "correctAnswer": None,
        "explanation": "Automatic fallback question.",
        "points": points
    }
    if qtype == 'mcq':
        base['options'] = ["Option A", "Option B", "Option C", "Option D"]
        base['correctAnswer'] = "Option A"
        base['question'] = f"(MOCK) Which metric best indicates business impact for {field}?"
    elif qtype == 'sql':
        base['question'] = f"(MOCK) Write a SQL query for {field} to count rows where a value is greater than 0."
        base['correctAnswer'] = "SELECT COUNT(*) FROM table_name WHERE column_name > 0;"
    elif qtype == 'output_prediction' or qtype == 'code_output':
        base['question'] = f"(MOCK) Predict the output of a code snippet relevant to {field}."
        base['correctAnswer'] = "42"
    elif qtype == 'code_debugging' or qtype == 'debugging':
        base['question'] = f"(MOCK) Debug the pipeline logic in a {field} example and identify the root cause."
        base['correctAnswer'] = "The bug is an off-by-one / incorrect condition."
    elif qtype == 'scenario':
        base['question'] = f"(MOCK) Given a production scenario in {field}, what would you investigate first?"
        base['correctAnswer'] = "Check data drift and model degradation in production."
    elif qtype == 'conceptual':
        base['question'] = f"(MOCK) Explain the trade-off between precision and recall in {field}."
        base['correctAnswer'] = "Higher precision reduces false positives; higher recall reduces false negatives."
    elif qtype == 'code_snippet' or qtype == 'code_completion' or qtype == 'coding':
        base['question'] = f"(MOCK) Complete the code snippet for a technical task in {field}."
        base['correctAnswer'] = "def example(): return 42"
    elif qtype == 'dsa':
        # Small algorithm / data-structures style question for fallback mode
        base['question'] = f"(MOCK) DSA: What is the time complexity of performing a binary search on a sorted array of length n?"
        base['correctAnswer'] = "O(log n)"
    else:
        base['question'] = f"(MOCK) Generic technical question for {field}"
        base['correctAnswer'] = "Answer"
    return base
