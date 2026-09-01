"""
AI Service for Round 3 Voice Interview System
Integrates with Google Gemini API for question generation and answer evaluation
"""
import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional local dependency guard
    genai = None

try:
    from prompts import (
        SYSTEM_PROMPT,
        get_question_generation_prompt,
        get_answer_evaluation_prompt,
        get_final_scoring_prompt
    )
except ModuleNotFoundError:  # support running as a package
    from .prompts import (
        SYSTEM_PROMPT,
        get_question_generation_prompt,
        get_answer_evaluation_prompt,
        get_final_scoring_prompt
    )

load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if genai is not None and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize model

def _resolve_model_id(candidate: str | None = None) -> str:
    raw = (candidate or os.getenv('GEMINI_MODEL_ID') or 'gemini-3.6-flash').strip()
    if not raw:
        return 'gemini-3.6-flash'
    if raw.startswith('models/'):
        raw = raw.split('/', 1)[1]
    deprecated = {'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'}
    if raw in deprecated:
        return 'gemini-3.6-flash'
    return raw

GEMINI_MODEL_ID = _resolve_model_id()
model = genai.GenerativeModel(GEMINI_MODEL_ID) if genai is not None and GEMINI_API_KEY else None


class AIService:
    """Core AI service for interview operations"""
    
    @staticmethod
    def generate_questions(resume_skills: str, job_description: str, domain: str) -> list[str]:
        """
        Generate 5 domain-specific interview questions
        
        Args:
            resume_skills: Extracted skills from resume
            job_description: Job posting description
            domain: Technical domain (e.g., "Cyber Security", "Full Stack Development")
            
        Returns:
            List of 5 interview questions
        """
        try:
            if model is None:
                raise RuntimeError("Gemini model is unavailable")

            prompt = get_question_generation_prompt(resume_skills, job_description, domain)
             
            response = model.generate_content(prompt)
            questions_text = response.text.strip()
            
            # Parse numbered questions
            questions = []
            lines = questions_text.split('\n')
            for line in lines:
                line = line.strip()
                # Match patterns like "1. Question" or "1) Question"
                match = re.match(r'^\d+[\.\)]\s*(.+)$', line)
                if match:
                    questions.append(match.group(1).strip())
            
            # Ensure we have exactly 5 questions
            if len(questions) < 5:
                raise ValueError(f"Expected 5 questions, got {len(questions)}")
            
            return questions[:5]
            
        except Exception as e:
            print(f"Error generating questions: {e}")
            # Fallback questions
            return [
                f"Can you describe a challenging project you worked on in {domain}?",
                f"What are your strongest technical skills relevant to {domain}?",
                "How do you stay updated with the latest technologies in your field?",
                "Describe a time when you had to debug a complex issue. How did you approach it?",
                "What interests you most about this role and how does it align with your career goals?"
            ]
    
    @staticmethod
    def evaluate_answer(question: str, answer_text: str, resume_summary: str) -> dict:
        """
        Evaluate a single voice answer on 4 parameters
        
        Args:
            question: The interview question
            answer_text: Transcribed voice answer
            resume_summary: Brief resume context
            
        Returns:
            Dictionary with scores and justifications for each parameter
        """
        try:
            if model is None:
                raise RuntimeError("Gemini model is unavailable")

            prompt = get_answer_evaluation_prompt(question, answer_text, resume_summary)
             
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(1)
            
            # Parse JSON response
            evaluation = json.loads(result_text)
            
            # Validate structure
            required_params = ['confidence', 'evidence', 'clarity', 'arrogance']
            for param in required_params:
                if param not in evaluation:
                    raise ValueError(f"Missing parameter: {param}")
                if 'score' not in evaluation[param]:
                    raise ValueError(f"Missing score for {param}")
            
            return evaluation
            
        except Exception as e:
            print(f"Error evaluating answer: {e}")
            # Fallback evaluation
            return {
                "confidence": {
                    "score": 5.0,
                    "justification": "Unable to evaluate - technical error",
                    "key_phrases": []
                },
                "evidence": {
                    "score": 5.0,
                    "justification": "Unable to evaluate - technical error",
                    "key_phrases": []
                },
                "clarity": {
                    "score": 5.0,
                    "justification": "Unable to evaluate - technical error",
                    "key_phrases": []
                },
                "arrogance": {
                    "score": 0.0,
                    "justification": "Unable to evaluate - technical error",
                    "key_phrases": []
                }
            }
    
    @staticmethod
    def calculate_final_score(evaluations: list[dict], domain: str) -> dict:
        """
        Calculate final assessment based on all answer evaluations
        
        Args:
            evaluations: List of evaluation dictionaries
            domain: Technical domain
            
        Returns:
            Final assessment with overall score and recommendation
        """
        try:
            if model is None:
                raise RuntimeError("Gemini model is unavailable")

            prompt = get_final_scoring_prompt(evaluations, domain)
             
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Extract JSON from response
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(1)
            
            # Parse JSON response
            final_assessment = json.loads(result_text)
            
            # Validate and ensure score is in range
            if 'overall_score' in final_assessment:
                final_assessment['overall_score'] = max(0, min(100, final_assessment['overall_score']))
            
            return final_assessment
            
        except Exception as e:
            print(f"Error calculating final score: {e}")
            
            # Fallback: Calculate manually
            if not evaluations:
                return {
                    "avg_confidence": 0,
                    "avg_evidence": 0,
                    "avg_clarity": 0,
                    "avg_arrogance": 0,
                    "overall_score": 0,
                    "recommendation": "REJECT",
                    "explanation": "No evaluations available",
                    "improvement_areas": []
                }
            
            # Calculate averages
            avg_confidence = sum(e['confidence']['score'] for e in evaluations) / len(evaluations)
            avg_evidence = sum(e['evidence']['score'] for e in evaluations) / len(evaluations)
            avg_clarity = sum(e['clarity']['score'] for e in evaluations) / len(evaluations)
            avg_arrogance = sum(e['arrogance']['score'] for e in evaluations) / len(evaluations)
            
            # Calculate overall score
            overall_score = ((avg_confidence + avg_evidence + avg_clarity - avg_arrogance) / 30) * 100
            overall_score = max(0, min(100, overall_score))
            
            # Determine recommendation
            if overall_score >= 75:
                recommendation = "SELECT"
            elif overall_score >= 50:
                recommendation = "HOLD"
            else:
                recommendation = "REJECT"
            
            return {
                "avg_confidence": round(avg_confidence, 2),
                "avg_evidence": round(avg_evidence, 2),
                "avg_clarity": round(avg_clarity, 2),
                "avg_arrogance": round(avg_arrogance, 2),
                "overall_score": round(overall_score, 2),
                "recommendation": recommendation,
                "explanation": f"Candidate scored {overall_score:.1f}/100 based on interview performance.",
                "improvement_areas": ["Provide more specific examples", "Improve technical clarity", "Demonstrate stronger confidence"]
            }


# Utility function for resume parsing
def extract_resume_text(file_path: str) -> str:
    """Extract text from PDF or DOCX resume"""
    try:
        if file_path.endswith('.pdf'):
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
        elif file_path.endswith('.docx'):
            from docx import Document
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        else:
            return ""
    except Exception as e:
        print(f"Error extracting resume text: {e}")
        return ""
