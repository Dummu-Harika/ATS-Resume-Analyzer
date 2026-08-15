import json
import os
import uuid
import difflib
from typing import Dict, List, Optional


import gemini_service

import random

class QuizSession:
    def __init__(self, field: str, context: dict = None):
        self.session_id = str(uuid.uuid4())
        self.field = field
        self.context = context or {}

        self.all_questions = []
        max_retries = 3
        last_questions = []
        for attempt in range(max_retries):
            full_quiz = gemini_service.generate_full_quiz(field, self.context)
            questions = full_quiz.get("questions", [])
            if len(questions) >= 6 and len(set(q.get("question", "") for q in questions)) >= len(questions) * 0.8:
                self.all_questions = questions
                break
            last_questions = questions
            print(f"DEBUG: Quiz generation attempt {attempt + 1} failed diversity check. Retrying...")

        if not self.all_questions:
            self.all_questions = last_questions if last_questions else []

        random.shuffle(self.all_questions)
        self.public_questions = [gemini_service.sanitize_public_question(q) for q in self.all_questions]

        self.history = []
        self.max_questions = len(self.all_questions) if self.all_questions else 0
        self.is_finished = False
        self.current_index = 0

    def _normalize_answer(self, value):
        if value is None:
            return ""
        if isinstance(value, list):
            return "|".join(str(v).strip().lower() for v in value)
        if isinstance(value, dict):
            return json.dumps(value, sort_keys=True).lower()
        return str(value).strip().lower()

    def _score_question(self, question: dict, user_answer: str):
        if user_answer is None or str(user_answer).strip() == "" or str(user_answer).strip() == "(Candidate Skipped)":
            return {"isCorrect": False, "pointsAwarded": 0, "maxPoints": question.get("points", 0), "feedback": "No answer submitted."}

        correct_answer = question.get("correctAnswer")
        if correct_answer is None:
            return {"isCorrect": False, "pointsAwarded": 0, "maxPoints": question.get("points", 0), "feedback": "No correct answer available for this question."}

        qtype = str(question.get("type", "mcq")).lower()
        if qtype in {"mcq", "fill_blank", "code_snippet", "code_debugging", "output_prediction", "sql", "scenario", "conceptual"}:
            normalized_user = self._normalize_answer(user_answer)
            normalized_correct = self._normalize_answer(correct_answer)
            is_correct = normalized_user == normalized_correct
            if not is_correct and isinstance(correct_answer, list):
                is_correct = normalized_user in [self._normalize_answer(item) for item in correct_answer]
            points = question.get("points", 0) if is_correct else 0
            feedback = "Correct." if is_correct else "Not fully correct. Review the technical concept and answer again."
            return {"isCorrect": is_correct, "pointsAwarded": points, "maxPoints": question.get("points", 0), "feedback": feedback}

        is_correct = False
        points = 0
        return {"isCorrect": is_correct, "pointsAwarded": points, "maxPoints": question.get("points", 0), "feedback": "This question requires manual evaluation."}

    def generate_next_question(self):
        if self.current_index >= self.max_questions:
            self.is_finished = True
            return None

        q = self.all_questions[self.current_index]
        return gemini_service.sanitize_public_question(q)

    def submit_answer(self, user_answer: str):
        if self.is_finished or self.current_index >= self.max_questions:
            return None

        question = self.all_questions[self.current_index]
        evaluation = self._score_question(question, user_answer)
        self.history.append({
            "question": question,
            "userAnswer": user_answer,
            "evaluation": evaluation,
        })

        self.current_index += 1
        if self.current_index >= self.max_questions:
            self.is_finished = True

        return {
            "status": "accepted",
            "isCorrect": evaluation["isCorrect"],
            "pointsAwarded": evaluation["pointsAwarded"],
            "maxPoints": evaluation["maxPoints"],
            "feedback": evaluation["feedback"],
        }

    def get_final_report(self):
        results = []
        total_score = 0
        max_score = 0
        for record in self.history:
            question = record["question"]
            evaluation = record["evaluation"]
            total_score += evaluation.get("pointsAwarded", 0)
            max_score += evaluation.get("maxPoints", 0)
            results.append({
                "questionId": question.get("id"),
                "question": question.get("question"),
                "isCorrect": evaluation.get("isCorrect", False),
                "pointsAwarded": evaluation.get("pointsAwarded", 0),
                "maxPoints": evaluation.get("maxPoints", 0),
                "userAnswer": record.get("userAnswer"),
                "correctAnswer": question.get("correctAnswer"),
                "feedback": evaluation.get("feedback", ""),
            })

        percentage = round((total_score / max_score * 100), 2) if max_score else 0
        report = {
            "totalScore": total_score,
            "maxScore": max_score,
            "percentage": percentage,
            "results": results,
            "overallFeedback": "Technical assessment completed. The backend evaluated your responses and compared them against the role-specific answer key.",
            "isSelected": percentage >= 70,
            "isFinished": True,
        }
        return report


sessions: Dict[str, QuizSession] = {}

def create_session(field: str, context: dict = None) -> QuizSession:
    session = QuizSession(field, context=context)
    sessions[session.session_id] = session
    return session

def get_session(session_id: str) -> Optional[QuizSession]:
    return sessions.get(session_id)
