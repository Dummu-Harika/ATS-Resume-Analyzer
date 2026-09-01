from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import os

try:
    import manager
except ModuleNotFoundError:  # support running as a package
    from . import manager

app = FastAPI(title="Technical Quiz API")

_quiz_allowed = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
_allowed_list = [o.strip() for o in _quiz_allowed.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartSessionRequest(BaseModel):
    field: str
    context: Optional[Dict] = None

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/start_session")
def start_session(request: StartSessionRequest):
    # Create a session and pass optional context through
    if request.context:
        session = manager.create_session(request.field, context=request.context)
    else:
        session = manager.create_session(request.field)
    first_question = session.generate_next_question()
    return {
        "session_id": session.session_id,
        "question": first_question
    }

@app.post("/submit_answer")
def submit_answer(request: SubmitAnswerRequest):
    session = manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    evaluation = session.submit_answer(request.answer)
    next_question = session.generate_next_question()
    
    if session.is_finished:
        return {
            "evaluation": evaluation,
            "next_question": None,
            "report": session.get_final_report()
        }
    
    return {
        "evaluation": evaluation,
        "next_question": next_question
    }


@app.get('/session/{session_id}/question')
def get_session_question(session_id: str):
    """Return the current next question for a session without advancing state."""
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')
    q = session.generate_next_question()
    if q is None:
        return { 'next_question': None }
    # sanitize public version
    public = manager.gemini_service.sanitize_public_question(q) if hasattr(manager, 'gemini_service') and hasattr(manager.gemini_service, 'sanitize_public_question') else q
    public.pop('correctAnswer', None)
    public.pop('explanation', None)
    return { 'next_question': public }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("QUIZ_PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
