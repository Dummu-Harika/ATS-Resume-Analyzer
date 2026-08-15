"""
Database Models for Round 3 Voice Interview System
"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class InterviewSession(Base):
    """Stores interview session metadata"""
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False)
    domain = Column(String(100), nullable=False)
    resume_skills = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    resume_summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("VoiceAnswer", back_populates="session", cascade="all, delete-orphan")
    assessment = relationship("FinalAssessment", back_populates="session", uselist=False, cascade="all, delete-orphan")


class InterviewQuestion(Base):
    """Generated questions for each session"""
    __tablename__ = "interview_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("VoiceAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan")


class VoiceAnswer(Base):
    """Transcribed answers with audio file reference"""
    __tablename__ = "voice_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id"), nullable=False)
    audio_file_path = Column(String(500))
    transcribed_text = Column(Text, nullable=False)
    duration_seconds = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("InterviewSession", back_populates="answers")
    question = relationship("InterviewQuestion", back_populates="answer")
    evaluation = relationship("AnswerEvaluation", back_populates="answer", uselist=False, cascade="all, delete-orphan")


class AnswerEvaluation(Base):
    """Parameter-wise scores for each answer"""
    __tablename__ = "answer_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("voice_answers.id"), nullable=False)
    
    # Scores (0-10)
    confidence_score = Column(Float, nullable=False)
    confidence_justification = Column(Text)
    confidence_key_phrases = Column(JSON)
    
    evidence_score = Column(Float, nullable=False)
    evidence_justification = Column(Text)
    evidence_key_phrases = Column(JSON)
    
    clarity_score = Column(Float, nullable=False)
    clarity_justification = Column(Text)
    clarity_key_phrases = Column(JSON)
    
    arrogance_score = Column(Float, nullable=False)
    arrogance_justification = Column(Text)
    arrogance_key_phrases = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    answer = relationship("VoiceAnswer", back_populates="evaluation")


class FinalAssessment(Base):
    """Overall interview assessment and recommendation"""
    __tablename__ = "final_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    
    # Average scores
    avg_confidence = Column(Float, nullable=False)
    avg_evidence = Column(Float, nullable=False)
    avg_clarity = Column(Float, nullable=False)
    avg_arrogance = Column(Float, nullable=False)
    
    # Final metrics
    overall_score = Column(Float, nullable=False)  # 0-100
    recommendation = Column(String(20), nullable=False)  # SELECT, HOLD, REJECT
    explanation = Column(Text, nullable=False)
    improvement_areas = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("InterviewSession", back_populates="assessment")
