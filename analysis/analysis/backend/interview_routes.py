"""
API Routes for Round 3 Voice Interview System
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil

from database import get_db
from models import (
    InterviewSession,
    InterviewQuestion,
    VoiceAnswer,
    AnswerEvaluation,
    FinalAssessment
)
from schemas import (
    InterviewSessionCreate,
    QuestionResponse,
    AnswerSubmit,
    AnswerEvaluationResponse,
    FinalAssessmentResponse,
    SessionResponse
)
from ai_service import AIService, extract_resume_text
from video_analysis_service import VideoAnalysisService

router = APIRouter(prefix="/api/interview", tags=["interview"])

# Initialize VideoAnalysisService
video_service = VideoAnalysisService()

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze-video")
async def analyze_interview_video(
    video: UploadFile = File(...),
    question: str = "Describe yourself",
    job_role: str = "Software Developer"
):
    """
    Complete video interview analysis combining voice and face.
    This is a standalone endpoint for analyzing a single interview clip.
    """
    # Save uploaded video
    file_extension = os.path.splitext(video.filename)[1]
    video_filename = f"analysis_{os.urandom(4).hex()}{file_extension}"
    video_path = os.path.join(UPLOAD_DIR, video_filename)
    
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    try:
        # Run complete analysis
        results = video_service.analyze_interview(video_path, question, job_role)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        # Optionally cleanup files if needed, but for now we keep them in UPLOAD_DIR
        pass



@router.post("/start", response_model=SessionResponse)
def start_interview_session(
    session_data: InterviewSessionCreate,
    db: Session = Depends(get_db)
):
    """
    Initialize a new interview session
    """
    # Create session
    session = InterviewSession(
        candidate_name=session_data.candidate_name,
        candidate_email=session_data.candidate_email,
        domain=session_data.domain,
        resume_skills=session_data.resume_skills,
        job_description=session_data.job_description,
        resume_summary=session_data.resume_summary
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


@router.post("/generate-questions/{session_id}", response_model=List[QuestionResponse])
def generate_questions(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate 5 interview questions for a session
    """
    # Get session
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if questions already exist
    existing_questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session_id
    ).all()
    
    if existing_questions:
        return [
            QuestionResponse(
                question_number=q.question_number,
                question_text=q.question_text
            )
            for q in existing_questions
        ]
    
    # Generate new questions
    questions_text = AIService.generate_questions(
        resume_skills=session.resume_skills,
        job_description=session.job_description,
        domain=session.domain
    )
    
    # Save questions to database
    questions = []
    for i, text in enumerate(questions_text, 1):
        question = InterviewQuestion(
            session_id=session_id,
            question_number=i,
            question_text=text
        )
        db.add(question)
        questions.append(question)
    
    db.commit()
    
    # Refresh to get IDs
    for q in questions:
        db.refresh(q)
    
    return [
        {
            "id": q.id,
            "question_number": q.question_number,
            "question_text": q.question_text
        }
        for q in questions
    ]


@router.post("/submit-answer/{session_id}")
async def submit_answer(
    session_id: int,
    request: Request,
    audio_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Submit a voice answer (with optional audio file).

    Accepts either:
    - application/json body: {question_id, transcribed_text, duration_seconds}
    - multipart/form-data with fields question_id, transcribed_text, duration_seconds and optional audio_file
    """
    # Parse answer_data depending on content type
    content_type = request.headers.get("content-type", "")
    answer_data_obj = None
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")
        try:
            answer_data_obj = AnswerSubmit(**body)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON fields: {str(e)}")
    else:
        # Handle multipart/form-data or form-encoded requests
        try:
            form = await request.form()
            qid = int(form.get("question_id"))
            transcribed_text = form.get("transcribed_text", "")
            duration_seconds = float(form.get("duration_seconds") or 0)
            answer_data_obj = AnswerSubmit(
                question_id=qid,
                transcribed_text=transcribed_text,
                duration_seconds=duration_seconds
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid form fields: {str(e)}")

    # Verify session exists
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify question exists
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == answer_data_obj.question_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Save audio file if provided
    audio_path = None
    if audio_file:
        file_extension = os.path.splitext(audio_file.filename)[1]
        audio_filename = f"session_{session_id}_q{question.question_number}{file_extension}"
        audio_path = os.path.join(UPLOAD_DIR, audio_filename)
        
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
    
    # Create answer record
    answer = VoiceAnswer(
        session_id=session_id,
        question_id=answer_data_obj.question_id,
        audio_file_path=audio_path,
        transcribed_text=answer_data_obj.transcribed_text,
        duration_seconds=answer_data_obj.duration_seconds
    )
    
    db.add(answer)
    db.commit()
    db.refresh(answer)
    
    # Evaluate the answer
    evaluation_data = AIService.evaluate_answer(
        question=question.question_text,
        answer_text=answer_data_obj.transcribed_text,
        resume_summary=session.resume_summary or session.resume_skills
    )
    
    # Save evaluation
    evaluation = AnswerEvaluation(
        answer_id=answer.id,
        confidence_score=evaluation_data['confidence']['score'],
        confidence_justification=evaluation_data['confidence']['justification'],
        confidence_key_phrases=evaluation_data['confidence']['key_phrases'],
        evidence_score=evaluation_data['evidence']['score'],
        evidence_justification=evaluation_data['evidence']['justification'],
        evidence_key_phrases=evaluation_data['evidence']['key_phrases'],
        clarity_score=evaluation_data['clarity']['score'],
        clarity_justification=evaluation_data['clarity']['justification'],
        clarity_key_phrases=evaluation_data['clarity']['key_phrases'],
        arrogance_score=evaluation_data['arrogance']['score'],
        arrogance_justification=evaluation_data['arrogance']['justification'],
        arrogance_key_phrases=evaluation_data['arrogance']['key_phrases']
    )
    
    db.add(evaluation)
    db.commit()
    
    return {
        "message": "Answer submitted and evaluated successfully",
        "answer_id": answer.id,
        "evaluation": evaluation_data
    }


@router.get("/evaluation/{session_id}/{question_number}", response_model=AnswerEvaluationResponse)
def get_answer_evaluation(
    session_id: int,
    question_number: int,
    db: Session = Depends(get_db)
):
    """
    Get evaluation for a specific answer
    """
    # Get question
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session_id,
        InterviewQuestion.question_number == question_number
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get answer
    answer = db.query(VoiceAnswer).filter(
        VoiceAnswer.question_id == question.id
    ).first()
    
    if not answer or not answer.evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    eval = answer.evaluation
    
    return AnswerEvaluationResponse(
        confidence={
            "score": eval.confidence_score,
            "justification": eval.confidence_justification,
            "key_phrases": eval.confidence_key_phrases or []
        },
        evidence={
            "score": eval.evidence_score,
            "justification": eval.evidence_justification,
            "key_phrases": eval.evidence_key_phrases or []
        },
        clarity={
            "score": eval.clarity_score,
            "justification": eval.clarity_justification,
            "key_phrases": eval.clarity_key_phrases or []
        },
        arrogance={
            "score": eval.arrogance_score,
            "justification": eval.arrogance_justification,
            "key_phrases": eval.arrogance_key_phrases or []
        }
    )


@router.get("/final-score/{session_id}", response_model=FinalAssessmentResponse)
def get_final_assessment(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Calculate and return final assessment for the session
    """
    # Check if assessment already exists
    existing_assessment = db.query(FinalAssessment).filter(
        FinalAssessment.session_id == session_id
    ).first()
    
    if existing_assessment:
        return FinalAssessmentResponse(
            avg_confidence=existing_assessment.avg_confidence,
            avg_evidence=existing_assessment.avg_evidence,
            avg_clarity=existing_assessment.avg_clarity,
            avg_arrogance=existing_assessment.avg_arrogance,
            overall_score=existing_assessment.overall_score,
            recommendation=existing_assessment.recommendation,
            explanation=existing_assessment.explanation,
            improvement_areas=existing_assessment.improvement_areas or []
        )
    
    # Get session
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all evaluations
    answers = db.query(VoiceAnswer).filter(VoiceAnswer.session_id == session_id).all()
    
    if not answers:
        raise HTTPException(status_code=400, detail="No answers submitted yet")
    
    evaluations = []
    for answer in answers:
        if answer.evaluation:
            evaluations.append({
                'confidence': {'score': answer.evaluation.confidence_score},
                'evidence': {'score': answer.evaluation.evidence_score},
                'clarity': {'score': answer.evaluation.clarity_score},
                'arrogance': {'score': answer.evaluation.arrogance_score}
            })
    
    if not evaluations:
        raise HTTPException(status_code=400, detail="No evaluations available")
    
    # Calculate final score
    final_data = AIService.calculate_final_score(evaluations, session.domain)
    
    # Save assessment
    assessment = FinalAssessment(
        session_id=session_id,
        avg_confidence=final_data['avg_confidence'],
        avg_evidence=final_data['avg_evidence'],
        avg_clarity=final_data['avg_clarity'],
        avg_arrogance=final_data['avg_arrogance'],
        overall_score=final_data['overall_score'],
        recommendation=final_data['recommendation'],
        explanation=final_data['explanation'],
        improvement_areas=final_data['improvement_areas']
    )
    
    db.add(assessment)
    db.commit()
    
    # Notify Resume Screener to run final aggregation if RESUME_API_URL is configured
    try:
        RESUME_API = os.environ.get('RESUME_API_URL') or os.environ.get('VITE_API_URL')
        if RESUME_API:
            # call in background so this endpoint does not block or fail if resume service is down
            import threading, requests
            def _notify_resume():
                try:
                    url = f"{RESUME_API.rstrip('/')}/aggregate_by_interview/{session_id}"
                    headers = {}
                    # Include aggregator webhook secret if configured in this service
                    secret = os.environ.get('AGGREGATOR_WEBHOOK_SECRET')
                    if secret:
                        headers['X-AGGREGATOR-SECRET'] = secret
                    requests.post(url, headers=headers, timeout=5)
                except Exception as _e:
                    print('Warning: Failed to notify resume screener for aggregation:', _e)
            threading.Thread(target=_notify_resume, daemon=True).start()
    except Exception as _e:
        print('Warning: Notification to resume screener failed to start:', _e)
    
    return FinalAssessmentResponse(**final_data)


@router.get("/sessions", response_model=List[SessionResponse])
def get_all_sessions(db: Session = Depends(get_db)):
    """
    Get all interview sessions (for recruiter dashboard)
    """
    sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).all()
    return sessions


@router.get("/session/{session_id}/details")
def get_session_details(session_id: int, db: Session = Depends(get_db)):
    """
    Get complete session details including questions, answers, and evaluations
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    questions_data = []
    for question in session.questions:
        answer = question.answer
        eval_data = None
        
        if answer and answer.evaluation:
            eval = answer.evaluation
            eval_data = {
                "confidence": {
                    "score": eval.confidence_score,
                    "justification": eval.confidence_justification,
                    "key_phrases": eval.confidence_key_phrases or []
                },
                "evidence": {
                    "score": eval.evidence_score,
                    "justification": eval.evidence_justification,
                    "key_phrases": eval.evidence_key_phrases or []
                },
                "clarity": {
                    "score": eval.clarity_score,
                    "justification": eval.clarity_justification,
                    "key_phrases": eval.clarity_key_phrases or []
                },
                "arrogance": {
                    "score": eval.arrogance_score,
                    "justification": eval.arrogance_justification,
                    "key_phrases": eval.arrogance_key_phrases or []
                }
            }
        
        questions_data.append({
            "question_number": question.question_number,
            "question_text": question.question_text,
            "answer": answer.transcribed_text if answer else None,
            "evaluation": eval_data
        })
    
    # Get final assessment if exists
    final_assessment = None
    if session.assessment:
        final_assessment = {
            "avg_confidence": session.assessment.avg_confidence,
            "avg_evidence": session.assessment.avg_evidence,
            "avg_clarity": session.assessment.avg_clarity,
            "avg_arrogance": session.assessment.avg_arrogance,
            "overall_score": session.assessment.overall_score,
            "recommendation": session.assessment.recommendation,
            "explanation": session.assessment.explanation,
            "improvement_areas": session.assessment.improvement_areas or []
        }
    
    return {
        "session": {
            "id": session.id,
            "candidate_name": session.candidate_name,
            "candidate_email": session.candidate_email,
            "domain": session.domain,
            "created_at": session.created_at
        },
        "questions": questions_data,
        "final_assessment": final_assessment
    }
