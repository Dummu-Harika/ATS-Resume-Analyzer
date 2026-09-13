from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.utils.parser import parse_resume
from backend.utils.analyzer import DepthAnalyzer
from backend.config import JOB_ROLES
import uvicorn
import json
import os
import shutil
import requests
from datetime import datetime, timezone
from typing import List
try:
    from supabase import create_client, Client
except Exception as e:
    create_client = None
    Client = None
    print('WARNING: Supabase SDK unavailable; optional Supabase features are disabled:', e)

# Persistence helpers for safe concurrent access to applications.json
from backend.persistence import ensure_data_file, read_applications, write_applications

def _find_project_root(start_dir: Path) -> Path:
    for candidate in [start_dir, *start_dir.parents]:
        if (candidate / ".env").exists():
            return candidate
    return start_dir

ROOT_DIR = _find_project_root(Path(__file__).resolve().parent)
load_dotenv(ROOT_DIR / ".env", override=False)

from fastapi import Depends, Header

app = FastAPI()

# --- Authentication / RBAC helpers ---
def _get_env_secret(name: str):
    v = os.environ.get(name)
    return v

async def verify_recruiter(x_api_key: str = Header(None)):
    """Dependency to verify recruiter API key passed in X-API-KEY header."""
    expected = _get_env_secret('RECRUITER_API_KEY')
    if not expected:
        # If no recruiter key configured, deny access in production; allow in development
        env = os.environ.get('ENVIRONMENT', 'development')
        if env == 'production':
            raise HTTPException(status_code=401, detail='Authentication not configured')
        else:
            # development: no auth configured -> allow but log a warning
            print('WARNING: RECRUITER_API_KEY not set; allowing recruiter endpoints in development')
            return
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail='Invalid or missing API key')

async def verify_aggregator_secret(x_aggregator_secret: str = Header(None)):
    """Dependency to verify aggregator webhook secret passed in X-AGGREGATOR-SECRET header."""
    expected = _get_env_secret('AGGREGATOR_WEBHOOK_SECRET')
    if not expected:
        env = os.environ.get('ENVIRONMENT', 'development')
        if env == 'production':
            raise HTTPException(status_code=401, detail='Aggregator webhook secret not configured')
        else:
            print('WARNING: AGGREGATOR_WEBHOOK_SECRET not set; allowing aggregator webhook in development')
            return
    if not x_aggregator_secret or x_aggregator_secret != expected:
        raise HTTPException(status_code=401, detail='Invalid or missing aggregator secret')


# Configure CORS from environment (comma-separated list), default to http://localhost:3000 for dev
_allowed = os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175'
)
_allowed_list = [o.strip() for o in _allowed.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Analysis Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
analyzer = DepthAnalyzer(ai_api_key=GEMINI_API_KEY)
DATA_FILE = "backend/data/applications.json"

# Interview API base (for aggregation)
INTERVIEW_API = os.environ.get("INTERVIEW_API_URL", "http://localhost:8004")

# Aggregator module
from backend.aggregator import aggregate_candidate

# Supabase Configuration (optional)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase = None
if create_client and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print('WARNING: Supabase client initialization failed:', e)

# Ensure data dir exists and initialize data file
ensure_data_file(DATA_FILE)

@app.get("/")
def read_root():
    return {"status": "Resume Screener API is running"}

@app.get("/jobs")
def get_jobs():
    return JOB_ROLES

@app.post("/analyze")
async def analyze_resume(role: str = Form(...), file: UploadFile = File(...)):
    """
    Parses and analyzes the uploaded resume.
    Returns the score and breakdown without saving yet.
    """
    try:
        content = await file.read()
        text = parse_resume(content, file.filename)
        print(f"DEBUG: Extracted text length: {len(text)}")
        
        if not text:
             raise HTTPException(
                status_code=422, 
                detail="The uploaded resume is unreadable or empty. If it's a PDF, please ensure it's not a scanned image or try a different file format (like .txt)."
             )
             
        if role not in JOB_ROLES:
            print(f"ERROR: Invalid role received: {role}")
            raise HTTPException(status_code=400, detail=f"Job role '{role}' is not configured.")

        result = await analyzer.analyze(text, role, file.filename)
        print(f"DEBUG: Analysis result keys: {list(result.keys())}")
        
        # Adapter to match frontend keys
        result['overallScore'] = result['final_score']
        
        # Determine Status based on Score
        status = "Submitted"
        # Determine Status based on Score (New: Shortlist > 60, Hold 40-60, Reject < 40)
        status = "Submitted"
        if result['overallScore'] > 60:
             status = "Shortlisted"
        elif result['overallScore'] >= 40:
             status = "On Hold"
        else:
             status = "Rejected"
             
        # Upload to Supabase Storage if configured
        resume_url = ""
        if supabase is not None:
            try:
                bucket_name = "resumes"
                file_path = f"{role}/{file.filename}"
                
                # Reset file pointer to beginning before uploading
                await file.seek(0)
                file_data = await file.read()
                
                # Upload the file
                supabase.storage.from_(bucket_name).upload(
                    file_path, 
                    file_data,
                    {"content-type": file.content_type, "x-upsert": "true"}
                )
                
                # Get Public URL
                resume_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
                print(f"DEBUG: Resume uploaded to Supabase: {resume_url}")
            except Exception as upload_err:
                import traceback
                print(f"ERROR: Supabase upload failed for {file.filename}")
                print(f"Exception Type: {type(upload_err)}")
                print(f"Exception Message: {str(upload_err)}")
                traceback.print_exc()
             
        return {
            "filename": file.filename,
            "text_preview": text[:200] + "...",
            "analysis": result,
            "suggested_status": status,
            "resume_url": resume_url
        }
    except HTTPException as he:
        # Re-raise HTTPExceptions as-is
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Log the specific error
        print(f"CRITICAL ERROR in /analyze: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/start_round2")
async def start_round2(payload: dict):
    """
    Starts a Round 2 quiz session for a candidate by proxying to the Quiz backend.
    Expects: { id: "REF-..." }
    Returns: { session_id: "...", question: { ... } }
    """
    try:
        candidate_id = payload.get('id')
        if not candidate_id:
            raise HTTPException(status_code=400, detail="Missing candidate id")
        apps = read_applications(DATA_FILE)
        target = None
        for app in apps:
            if app.get('id') == candidate_id:
                target = app
                break
        if not target:
            raise HTTPException(status_code=404, detail='Candidate not found')

        existing_session_id = target.get('quiz_session_id')
        if existing_session_id:
            QUIZ_API = os.environ.get('QUIZ_API_URL', 'http://localhost:8003')
            try:
                resp = requests.get(f"{QUIZ_API}/session/{existing_session_id}/question", timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    question = data.get('next_question')
                    if question and isinstance(question, dict):
                        question.pop('correctAnswer', None)
                        question.pop('explanation', None)
                    return {'session_id': existing_session_id, 'question': question}
            except Exception:
                pass

        analysis = target.get('analysis', {}) or {}

        def as_text(value):
            if value is None:
                return ''
            if isinstance(value, str):
                return value
            if isinstance(value, (dict, list, tuple)):
                return json.dumps(value, ensure_ascii=False, sort_keys=True)
            return str(value)

        def as_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return [str(v) for v in value if v is not None]
            if isinstance(value, tuple):
                return [str(v) for v in value if v is not None]
            if isinstance(value, dict):
                return [str(v) for v in value.values() if v is not None]
            if isinstance(value, str):
                parts = [p.strip() for p in value.replace(';', ',').split(',') if p.strip()]
                return parts or [value.strip()]
            return [str(value)]

        resume_text = as_text(target.get('resume_text') or target.get('text_preview') or '')
        if not resume_text:
            for candidate_value in [analysis.get('final_report'), analysis.get('summary'), analysis.get('ai_analysis', {}).get('final_report'), analysis.get('ai_analysis', {}).get('summary')]:
                candidate_text = as_text(candidate_value)
                if candidate_text and candidate_text != '{}':
                    resume_text = candidate_text
                    break
        resume_text = resume_text[:2000]

        matched_skills = as_list(analysis.get('matched_skills') or analysis.get('matchedSkills'))
        missing_skills = as_list(analysis.get('missing_skills') or analysis.get('missingSkills'))
        project_list = as_list(analysis.get('projects') or analysis.get('ai_analysis', {}).get('projects') or target.get('projects'))
        if not project_list and isinstance(analysis.get('final_report'), dict):
            project_list = as_list(analysis.get('final_report').get('projects') or analysis.get('final_report').get('project_summary'))

        experience_summary = analysis.get('experience') or analysis.get('ai_analysis', {}).get('experience') or target.get('experience') or {}
        years_of_experience = 0
        if isinstance(experience_summary, dict):
            years_of_experience = experience_summary.get('years') or experience_summary.get('total_years') or 0
        elif isinstance(experience_summary, (int, float)):
            years_of_experience = experience_summary

        relevant_technologies = list(dict.fromkeys(matched_skills + missing_skills))[:8]

        context = {
            'role': as_text(target.get('role') or analysis.get('role') or 'FullStackDeveloper'),
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'projects': project_list,
            'years_of_experience': years_of_experience,
            'resume_snippet': resume_text,
            'relevant_technologies': relevant_technologies,
        }

        QUIZ_API = os.environ.get('QUIZ_API_URL', 'http://localhost:8003')
        payload = {'field': context.get('role') or 'General', 'context': context}
        session_id = None
        question = None
        try:
            resp = requests.post(f"{QUIZ_API}/start_session", json=payload, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                session_id = data.get('session_id')
                question = data.get('question')
            else:
                print(f"Quiz service non-200 ({resp.status_code}): {resp.text}")
        except Exception as net_err:
            print("Quiz service connection notice:", net_err)

        if not session_id or not question:
            import uuid
            session_id = f"quiz-{uuid.uuid4().hex[:12]}"
            role_name = context.get('role', 'FullStackDeveloper')
            question = {
                "id": 1,
                "type": "mcq",
                "question": f"When architecting scalable production microservices for {role_name}, which design strategy best prevents cascading failures under high latency?",
                "options": [
                    "Implementing circuit breaker patterns with exponential backoff and localized fallback caches",
                    "Increasing global timeout thresholds infinitely across all downstream HTTP clients",
                    "Directly retrying failing network requests in tight infinite loops without delay",
                    "Executing all network service calls in a single synchronous blocking database thread"
                ],
                "points": 10
            }

        # Persist session id against candidate
        for app in apps:
            if app.get('id') == candidate_id:
                app['quiz_session_id'] = session_id
                app['quiz_started_at'] = datetime.now(timezone.utc).isoformat()
        write_applications(DATA_FILE, apps)

        # Ensure correctAnswer not leaked
        if question and isinstance(question, dict):
            question.pop('correctAnswer', None)
            question.pop('explanation', None)

        return {'session_id': session_id, 'question': question}

    except HTTPException:
        raise
    except Exception as e:
        print('ERROR in /start_round2:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/round2/question')
def get_round2_question(session_id: str):
    """Fetch the current question for the given quiz session id by proxying to the Quiz service.
    Returns { next_question: { ... } } or next_question: None if finished.
    """
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail='Missing session_id')
        QUIZ_API = os.environ.get('QUIZ_API_URL', 'http://localhost:8003')
        resp = requests.get(f"{QUIZ_API}/session/{session_id}/question", timeout=10)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail='Quiz session not found')
        if resp.status_code != 200:
            # Propagate other Quiz service errors as 502
            raise HTTPException(status_code=502, detail=f"Quiz service error: {resp.status_code} {resp.text}")
        data = resp.json()
        # ensure no answers leaked
        if data.get('next_question') and isinstance(data.get('next_question'), dict):
            data['next_question'].pop('correctAnswer', None)
            data['next_question'].pop('explanation', None)
        return data
    except HTTPException:
        raise
    except Exception as e:
        print('ERROR in /round2/question:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/round2/submit")
async def round2_submit(payload: dict):
    """
    Submit an answer for Round 2. Proxies to Quiz backend and persists final report when quiz finishes.
    Expects: { session_id: '...', answer: '...' }
    """
    try:
        session_id = payload.get('session_id')
        answer = payload.get('answer')
        if not session_id:
            raise HTTPException(status_code=400, detail='Missing session_id')

        QUIZ_API = os.environ.get('QUIZ_API_URL', 'http://localhost:8003')
        resp = requests.post(f"{QUIZ_API}/submit_answer", json={'session_id': session_id, 'answer': answer}, timeout=180)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail='Quiz session not found')
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Quiz service error: {resp.status_code} {resp.text}")
        data = resp.json()

        # If final report present, persist it to the application record, but sanitize before returning to candidate
        report = data.get('report')
        if report:
            # persist full report server-side
            try:
                apps = read_applications(DATA_FILE)
                for app in apps:
                    if app.get('quiz_session_id') == session_id:
                        app['quiz_report_full'] = report
                        if isinstance(report, dict):
                            app['quiz_score'] = report.get('percentage') or report.get('totalScore')
                write_applications(DATA_FILE, apps)
            except Exception as e:
                print('WARNING: Failed to persist quiz report:', e)

            # Create a sanitized view for the candidate (remove correct answers)
            safe_report = dict(report)
            if isinstance(safe_report, dict) and 'results' in safe_report:
                try:
                    sanitized_results = []
                    for r in safe_report.get('results', []):
                        rcp = dict(r)
                        rcp.pop('correctAnswer', None)
                        rcp.pop('explanation', None)
                        sanitized_results.append(rcp)
                    safe_report['results'] = sanitized_results
                except Exception:
                    pass
            data['report'] = safe_report

        # Ensure next_question public version has no correctAnswer
        if data.get('next_question') and isinstance(data.get('next_question'), dict):
            data['next_question'].pop('correctAnswer', None)
            data['next_question'].pop('explanation', None)

        return data

    except HTTPException:
        raise
    except Exception as e:
        print('ERROR in /round2/submit:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/start_round3")
async def start_round3(payload: dict):
    """
    Starts Round 3 by creating a session in the existing interview project.
    Payload: { id: "REF-..." }
    Returns the interview session metadata and launch URL.
    """
    try:
        candidate_id = payload.get('id')
        if not candidate_id:
            raise HTTPException(status_code=400, detail='Missing candidate id')

        apps = read_applications(DATA_FILE)

        target = None
        for app in apps:
            if app.get('id') == candidate_id:
                target = app
                break
        if not target:
            raise HTTPException(status_code=404, detail='Candidate not found')

        quiz_score = target.get('quiz_score')
        quiz_report = target.get('quiz_report_full') or {}
        qualified = False
        if isinstance(quiz_report, dict):
            qualified = bool(quiz_report.get('isSelected'))
        if not qualified and isinstance(quiz_score, (int, float)):
            qualified = float(quiz_score) >= 70
        if not qualified:
            raise HTTPException(status_code=400, detail='Candidate is not qualified for Round 3')

        analysis_data = (target.get('analysis') or {})
        matched_skills = analysis_data.get('matched_skills') or analysis_data.get('matchedSkills') or []
        if not isinstance(matched_skills, list):
            matched_skills = [matched_skills] if matched_skills else []

        final_report = analysis_data.get('final_report') or analysis_data.get('summary') or ''
        if isinstance(final_report, dict):
            final_report = json.dumps(final_report, ensure_ascii=False, sort_keys=True)

        analysis_payload = {
            'candidate_name': target.get('name') or 'Candidate',
            'candidate_email': target.get('email') or 'candidate@example.com',
            'domain': target.get('role') or 'General',
            'resume_skills': ', '.join([str(s) for s in matched_skills]) if matched_skills else (final_report[:500] if isinstance(final_report, str) else ''),
            'job_description': target.get('role') or 'General role',
            'resume_summary': final_report if isinstance(final_report, str) else str(final_report)
        }

        interview_api = os.environ.get('INTERVIEW_API_URL', 'http://localhost:8004')
        resp = requests.post(f"{interview_api}/api/interview/start", json=analysis_payload, timeout=20)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Interview service error: {resp.text}")

        data = resp.json()
        session_id = data.get('id')
        if not session_id:
            raise HTTPException(status_code=502, detail='Interview session could not be created')

        for app in apps:
            if app.get('id') == candidate_id:
                app['interview_session_id'] = session_id
                app['interview_started_at'] = datetime.now(timezone.utc).isoformat()
                app['status'] = 'Interview Ready'

        write_applications(DATA_FILE, apps)

        return {
            'candidate_id': candidate_id,
            'session_id': session_id,
            'status': 'ready',
            'interview_url': os.environ.get('VITE_INTERVIEW_URL', 'http://localhost:5173'),
            'candidate_name': analysis_payload['candidate_name'],
            'domain': analysis_payload['domain']
        }
    except HTTPException:
        raise
    except Exception as e:
        print('ERROR in /start_round3:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recruiter/login")
async def recruiter_login(credentials: dict):
    email = credentials.get("email", "").strip()
    password = credentials.get("password", "").strip()
    
    # Accept standard recruiter credentials or demo
    if (email == "recruiter@talentai.io" and password == "recruiter123") or (email and password and (password == "admin123" or password == "recruiter123" or "demo" in email.lower())):
        return {
            "success": True,
            "token": "recruiter-jwt-token-talentai-secure",
            "recruiter": {
                "name": "Sarah Jenkins",
                "email": email or "recruiter@talentai.io",
                "role": "Lead Talent Acquisition Partner",
                "organization": "TalentAI Global"
            }
        }
    
    # Flexible validation for demo access
    if "@" in email and len(password) >= 4:
        return {
            "success": True,
            "token": "recruiter-jwt-token-talentai-secure",
            "recruiter": {
                "name": email.split("@")[0].replace(".", " ").title(),
                "email": email,
                "role": "Senior Technical Recruiter",
                "organization": "TalentAI Global"
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid recruiter credentials. Use recruiter@talentai.io / recruiter123 for demo access.")


@app.post("/submit_round3_result")
async def submit_round3_result(payload: dict):
    """
    Saves Round 3 voice/video interview evaluation into candidate record,
    updates overall score and status, and triggers multi-round aggregation.
    """
    try:
        candidate_id = payload.get("candidate_id")
        if not candidate_id:
            raise HTTPException(status_code=400, detail="Candidate id required")
        
        score = payload.get("interview_score") or payload.get("overall_score") or 0
        report = payload.get("report") or payload.get("round3_report") or {}
        
        apps = read_applications(DATA_FILE)
        target = None
        for app in apps:
            if app.get("id") == candidate_id:
                target = app
                break
                
        if not target:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
        target["interview_score"] = float(score)
        target["round3_report"] = report
        target["round3_completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Calculate aggregated score
        r1 = float(target.get("score") or (target.get("analysis") or {}).get("overallScore") or 0)
        r2 = float(target.get("quiz_score") or (target.get("quiz_report_full") or {}).get("percentage") or 0)
        r3 = float(score)
        
        composite_score = round((r1 * 0.40) + (r2 * 0.30) + (r3 * 0.30), 1)
        
        # Determine qualification across rounds (R1 >= 60, R2 >= 70, R3 >= 80)
        r1_cleared = r1 >= 60
        r2_cleared = r2 >= 70
        r3_cleared = r3 >= 80
        
        if r1_cleared and r2_cleared and r3_cleared:
            verdict = "SHORTLISTED"
            target["status"] = "Shortlisted"
        elif r1_cleared and r2_cleared:
            verdict = "ON HOLD"
            target["status"] = "On Hold"
        else:
            verdict = "REJECTED"
            target["status"] = "Rejected"
            
        target["final_result"] = {
            "round1_score": r1,
            "round2_score": r2,
            "round3_score": r3,
            "composite_score": composite_score,
            "verdict": verdict,
            "recommendation": "STRONGLY RECOMMENDED" if verdict == "SHORTLISTED" else ("RECOMMENDED" if verdict == "ON HOLD" else "NOT RECOMMENDED"),
            "round1_cleared": r1_cleared,
            "round2_cleared": r2_cleared,
            "round3_cleared": r3_cleared,
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }
        
        write_applications(DATA_FILE, apps)
        return {
            "success": True,
            "candidate_id": candidate_id,
            "final_result": target["final_result"],
            "status": target["status"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print('ERROR in /submit_round3_result:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update_quiz_score")
async def update_quiz_score(payload: dict):
    """
    Updates the quiz score for a candidate.
    Payload: { id: "REF-...", quiz_score: 85.5 }
    """
    try:
        target_id = payload.get('id')
        quiz_score = payload.get('quiz_score')
        
        apps = read_applications(DATA_FILE)
              
        found = False
        for app in apps:
            if app['id'] == target_id:
                app['quiz_score'] = quiz_score
                found = True
                break
        
        if found:
            write_applications(DATA_FILE, apps)
            return {"success": True}
        else:
            raise HTTPException(status_code=404, detail="Candidate not found")
             
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/aggregate_final/{candidate_id}")
async def aggregate_final(candidate_id: str, recruiter=Depends(verify_recruiter)):
    """Aggregate final result for a candidate by combining Round1/2/3 results.

    This endpoint is idempotent and will overwrite any existing final_result field with the computed aggregation.
    """
    try:
        res = aggregate_candidate(candidate_id, DATA_FILE, INTERVIEW_API)
        return res
    except KeyError:
        raise HTTPException(status_code=404, detail="Candidate not found")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print('ERROR in /aggregate_final:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/aggregate_by_interview/{session_id}")
async def aggregate_by_interview(session_id: int, agg=Depends(verify_aggregator_secret)):
    """Locate candidate by interview_session_id and run aggregation. This is intended for callbacks from Round 3 service."""
    try:
        apps = read_applications(DATA_FILE)
        candidate_id = None
        for app in apps:
            # interview_session_id may be stored as int or str
            sid = app.get('interview_session_id')
            if sid is None:
                continue
            try:
                if int(sid) == int(session_id):
                    candidate_id = app.get('id')
                    break
            except Exception:
                # fallback compare as str
                if str(sid) == str(session_id):
                    candidate_id = app.get('id')
                    break
        if not candidate_id:
            raise HTTPException(status_code=404, detail='Candidate with given interview session not found')
        res = aggregate_candidate(candidate_id, DATA_FILE, INTERVIEW_API)
        return res
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print('ERROR in /aggregate_by_interview:', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/apply")
async def submit_application(application: dict):
    """    Saves the application to the JSON DB.
    """
    try:
        apps = read_applications(DATA_FILE)
        
        # Add ID
        application['id'] = f"REF-{len(apps) + 1000}"
        application['timestamp'] = "Just now"
        
        apps.append(application)
        
        write_applications(DATA_FILE, apps)
            
        return application
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/candidates")
def get_candidates(recruiter=Depends(verify_recruiter)):
    """
    Returns all applications for the recruiter.
    """
    try:
        try:
            return read_applications(DATA_FILE)
        except Exception:
            return []
    except Exception as e:
        return []

@app.post("/update_status")
async def update_status(payload: dict, recruiter=Depends(verify_recruiter)):
    """
    Update candidate status.
    Payload: { id: "REF-...", status: "Shortlisted" }
    """
    try:
        target_id = payload.get('id')
        new_status = payload.get('status')
        
        apps = read_applications(DATA_FILE)
            
        found = False
        for app in apps:
            if app['id'] == target_id:
                app['status'] = new_status
                found = True
                break
        
        if found:
            write_applications(DATA_FILE, apps)
            return {"success": True}
        else:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete_candidate/{candidate_id}")
async def delete_candidate(candidate_id: str, recruiter=Depends(verify_recruiter)):
    """
    Deletes a candidate application from the JSON DB.
    """
    try:
        if not os.path.exists(DATA_FILE):
            raise HTTPException(status_code=404, detail="Data file not found")
            
        apps = read_applications(DATA_FILE)
            
        initial_count = len(apps)
        apps = [app for app in apps if app.get('id') != candidate_id]
        
        if len(apps) == initial_count:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
        write_applications(DATA_FILE, apps)
            
        return {"success": True, "message": f"Candidate {candidate_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
