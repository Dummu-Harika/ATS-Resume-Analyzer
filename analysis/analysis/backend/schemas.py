"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class InterviewSessionCreate(BaseModel):
    candidate_name: str
    candidate_email: EmailStr
    domain: str
    resume_skills: str
    job_description: str
    resume_summary: Optional[str] = ""


class QuestionResponse(BaseModel):
    question_number: int
    question_text: str


class AnswerSubmit(BaseModel):
    question_id: int
    transcribed_text: str
    duration_seconds: Optional[float] = 0


class ParameterScore(BaseModel):
    score: float
    justification: str
    key_phrases: List[str]


class AnswerEvaluationResponse(BaseModel):
    confidence: ParameterScore
    evidence: ParameterScore
    clarity: ParameterScore
    arrogance: ParameterScore


class FinalAssessmentResponse(BaseModel):
    avg_confidence: float
    avg_evidence: float
    avg_clarity: float
    avg_arrogance: float
    overall_score: float
    recommendation: str
    explanation: str
    improvement_areas: List[str]


class SessionResponse(BaseModel):
    id: int
    candidate_name: str
    candidate_email: str
    domain: str
    created_at: datetime
    
    class Config:
        from_attributes = True
