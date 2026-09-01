"""
Simplified API route for direct answer evaluation
"""
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from ai_service import AIService
except ModuleNotFoundError:  # support running as a package
    from .ai_service import AIService

router = APIRouter(prefix="/api", tags=["evaluation"])

class AnswerEvaluationRequest(BaseModel):
    question: str
    answer: str
    question_number: int

@router.post("/evaluate-answer")
def evaluate_answer(request: AnswerEvaluationRequest):
    """
    Evaluate a single answer on 4 parameters:
    - Confidence
    - Evidence  
    - Clarity
    - Arrogance
    """
    try:
        evaluation = AIService.evaluate_answer(
            question=request.question,
            answer_text=request.answer,
            resume_summary=""  # Not needed for HR questions
        )
        return evaluation
    except Exception as e:
        # Fallback evaluation
        return {
            "confidence": {
                "score": 5.0,
                "justification": "Unable to fully evaluate - please try again",
                "key_phrases": []
            },
            "evidence": {
                "score": 5.0,
                "justification": "Unable to fully evaluate - please try again",
                "key_phrases": []
            },
            "clarity": {
                "score": 5.0,
                "justification": "Unable to fully evaluate - please try again",
                "key_phrases": []
            },
            "arrogance": {
                "score": 0.0,
                "justification": "Unable to fully evaluate - please try again",
                "key_phrases": []
            }
        }
