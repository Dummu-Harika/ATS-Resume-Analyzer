import os
import json
import uuid
import random
import httpx
import ssl
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

ROOT_DIR = Path(__file__).resolve().parents[2]
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
MOCK_AI = os.environ.get("MOCK_AI", "true" if APP_ENV != "production" else "false").strip().lower() == "true"
API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY and not MOCK_AI and APP_ENV == "production":
    raise RuntimeError("GEMINI_API_KEY environment variable is required for production Gemini integration")

# Patch httpx which genai uses under the hood
original_httpx_client = httpx.Client
class UnverifiedClient(original_httpx_client):
    def __init__(self, *args, **kwargs):
        kwargs['verify'] = False
        super().__init__(*args, **kwargs)
httpx.Client = UnverifiedClient

client = genai.Client(api_key=API_KEY) if API_KEY else None
MODEL_ID = "gemini-2.0-flash-exp"


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
    if not isinstance(questions, list) or len(questions) < 5:
        raise ValueError("AI returned insufficient questions")
    cleaned = []
    seen_ids = set()
    for idx, question in enumerate(questions, start=1):
        normalized = _normalize_question(question, idx)
        if normalized["id"] in seen_ids:
            normalized["id"] = len(cleaned) + 1
        seen_ids.add(normalized["id"])
        cleaned.append(normalized)
    if len(cleaned) != len(questions):
        raise ValueError("Could not validate all generated questions")
    difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
    for q in cleaned:
        difficulty_counts[q["difficulty"]] += 1
    if max(difficulty_counts.values()) > len(cleaned) * 0.5:
        raise ValueError("Difficulty distribution invalid")
    return cleaned


def sanitize_public_question(question: dict) -> dict:
    public_question = dict(question)
    public_question.pop("correctAnswer", None)
    public_question.pop("explanation", None)
    public_question.pop("internal_prompt", None)
    public_question.pop("grading_hint", None)
    return public_question


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
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        # Improved logging
        import traceback
        print(f"CRITICAL: Gemini API Error (generate_single_question): {str(e)}")
        print(traceback.format_exc())
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
    4. Include variety: MCQ, multiple_select, fill_blank, code_snippet, scenario, conceptual, SQL, or output_prediction.
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
          "type": "mcq|multiple_select|fill_blank|code_snippet|code_debugging|output_prediction|sql|scenario|conceptual",
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
    - Generate between 10 and 15 questions total.
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
        parsed = json.loads(raw_text)
        validated_questions = _validate_question_set(parsed)
        return {"questions": validated_questions}
    except Exception as e:
        print(f"CRITICAL: Gemini API Error (generate_full_quiz): {e}")
        if MOCK_AI:
            return get_mock_full_quiz(field, cleaned_context)
        raise

def evaluate_quiz_submission(questions: list, user_answers_list: list):
    prompt = f"""
    You are an expert technical evaluator. 
    Grade the following user answers for a {len(questions)}-question technical quiz.

    Questions Data (Reference):
    {json.dumps(questions)}

    User's Submitted Answers:
    {json.dumps(user_answers_list)}

    STRICT VALIDATION RULES:
    1. MATCHING: For each answer in 'User's Submitted Answers', find the question in 'Questions Data' with the EXACT SAME 'id'.
    2. SKIPPED: If userAnswer is "(Candidate Skipped)", ALWAYS award 0 points.
    3. MCQs: Exact match required (case-insensitive).
    4. Fill-in-the-blanks: Semantic correctness of the technical term.
    5. Code Snippets: Strict functional correctness.
    6. ACCURACY: Ensure the question text and expected answer in your JSON response match the 'Questions Data' EXACTLY for that question ID. No mismatches allowed.

    SCORING (STRICT 175 TOTAL):
    - Easy questions: 5 points
    - Medium questions: 10 points
    - Hard questions: 15 points
    - The 'maxScore' MUST be exactly the sum of 'points' from all 20 questions (Should be 175).
    - The 'totalScore' is the sum of points awarded.
    - The 'percentage' is (totalScore / maxScore) * 100.

    Output Format (JSON):
    {{
      "totalScore": number,
      "maxScore": 175,
      "percentage": number,
      "results": [
        {{
          "questionId": id,
          "question": "EXACT question text from source",
          "isCorrect": boolean,
          "pointsAwarded": number (0 OR full points based on difficulty),
          "maxPoints": number (5, 10, or 15),
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
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error (evaluate_quiz_submission): {e}")
        if MOCK_AI:
            return get_mock_evaluation_result(questions, user_answers_list)
        raise


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
            "options": ["Missing values and schema drift", "Font rendering", "Logo color", "Page load speed"],
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
            "type": "scenario",
            "difficulty": "medium",
            "question": "A model built for {project} shows strong training accuracy but poor deployment performance. What is the most likely next investigation?",
            "options": [],
            "correctAnswer": "Check for data leakage, feature drift, and different production distributions",
            "explanation": "Good training performance can hide distribution drift and leakage issues in production.",
        },
        {
            "type": "conceptual",
            "difficulty": "hard",
            "question": "If a candidate claims experience with {skill1} but the project description only mentions basic reporting, what is the strongest way to challenge that claim in an interview?",
            "options": [],
            "correctAnswer": "Ask them to explain feature engineering, modeling tradeoffs, validation logic, and business impact",
            "explanation": "Claims should be tested through hands-on reasoning and project-specific technical decisions.",
        },
        {
            "type": "code_snippet",
            "difficulty": "hard",
            "question": "Which Python pattern is most appropriate for checking missing values before training on a dataset used in {project}?",
            "options": ["df.isna().sum() and feature imputation", "random.shuffle(df)", "print(df.head()) only", "drop all rows without labels"],
            "correctAnswer": "df.isna().sum() and feature imputation",
            "explanation": "Data quality checks and imputation are central to reliable model training.",
        },
        {
            "type": "mcq",
            "difficulty": "medium",
            "question": "When a resume highlights {skill1} and {skill2}, which practice best validates that those skills were used on a real project?",
            "options": ["Evaluating design tradeoffs and model metrics from the project", "Rechecking only the resume formatting", "Ignoring the project and focusing on certificates", "Counting the number of libraries mentioned"],
            "correctAnswer": "Evaluating design tradeoffs and model metrics from the project",
            "explanation": "Strong technical evidence comes from explaining decisions, systems, and measured outcomes.",
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
            "type": template["type"],
            "question": q_text,
            "options": template.get("options", []),
            "correctAnswer": template["correctAnswer"],
            "explanation": template["explanation"],
            "points": 5 if template["difficulty"] == "easy" else 10 if template["difficulty"] == "medium" else 15,
            "internal_prompt": f"Role: {field}; candidate context: {json.dumps(context, ensure_ascii=False)[:200]}",
            "grading_hint": "Use resume-aware technical reasoning and project-specific evidence.",
        }
        question_list.append(q)

    # Ensure the mock quiz returns exactly 15 questions for local/dev use.
    # If templates are fewer than 15, duplicate and slightly vary them to reach 15.
    idx_offset = len(question_list)
    j = 0
    while len(question_list) < 15:
        base = templates[j % len(templates)]
        q_text = base["question"].format(
            field=field,
            project=project_focus,
            skill1=skill1,
            skill2=skill2,
        ) + f" (variant {len(question_list) + 1})"
        q = {
            "id": len(question_list) + 1,
            "difficulty": base["difficulty"],
            "type": base["type"],
            "question": q_text,
            "options": base.get("options", []),
            "correctAnswer": base["correctAnswer"],
            "explanation": base["explanation"],
            "points": 5 if base["difficulty"] == "easy" else 10 if base["difficulty"] == "medium" else 15,
            "internal_prompt": f"Role: {field}; candidate context: {json.dumps(context, ensure_ascii=False)[:200]}",
            "grading_hint": "Use resume-aware technical reasoning and project-specific evidence.",
        }
        question_list.append(q)
        j += 1

    random.shuffle(question_list)
    return {"questions": question_list}

def get_mock_evaluation_result(questions: list, user_answers_list: list):
    # Simple programmatic grading fallback
    results = []
    total_score = 0
    max_score = 0
    
    for q in questions:
        user_ans = next((a["userAnswer"] for a in user_answers_list if a["questionId"] == q["id"]), "")
        is_correct = user_ans.strip().lower() == q["correctAnswer"].strip().lower()
        pts = q["points"] if is_correct else 0
        total_score += pts
        max_score += q["points"]
        
        results.append({
            "questionId": q["id"],
            "question": q["question"],
            "isCorrect": is_correct,
            "pointsAwarded": pts,
            "maxPoints": q["points"],
            "userAnswer": user_ans,
            "correctAnswer": q["correctAnswer"],
            "feedback": "Graded by local fallback system."
        })
        
    perc = (total_score / max_score * 100) if max_score > 0 else 0
    return {
        "totalScore": total_score,
        "maxScore": max_score,
        "percentage": perc,
        "results": results,
        "overallFeedback": "The AI evaluation service is currently unavailable. Displaying basic results.",
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
    else:
        base['question'] = f"(MOCK) Generic technical question for {field}"
        base['correctAnswer'] = "Answer"
    return base

