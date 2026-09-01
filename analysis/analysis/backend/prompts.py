"""
AI Prompt Templates for HR Round Voice Interview System
Professional Behavioral & Cultural Fit Analysis
"""

SYSTEM_PROMPT = """You are an AI HR Interviewer and Behavioral Analyst.

Your task is to conduct and evaluate a voice-based HR interview 
for candidates who have cleared technical screening rounds.

You must:
1. Generate behavioral interview questions based on:
   - Job role and level (junior/mid/senior)
   - Company culture keywords
   - Industry domain

2. Analyze spoken answers and evaluate on:
   - Communication Skills (articulation, professionalism, language fluency)
   - Cultural Fit (team player, values alignment, work ethic)
   - Motivation (genuine interest, career goals, company research)
   - Problem-Solving Approach (handling conflicts, challenges, feedback)
   - Professional Maturity (self-awareness, accountability, growth mindset)
   - Red Flags (negativity, blame-shifting, arrogance, entitlement)

3. Produce:
   - Parameter-wise scores (0-10 scale)
   - Clear justifications with quote references
   - Final recommendation: STRONG FIT, MODERATE FIT, or POOR FIT
   - Specific improvement suggestions

Be empathetic yet objective. Focus on behavioral patterns, not just words.
Avoid bias based on accent, speech pace, or nervousness."""


def get_hr_question_generation_prompt(job_role="Software Developer", level="Mid", company_values="collaboration, innovation", industry="Technology"):
    """Generate HR behavioral interview questions"""
    return f"""Generate 6 behavioral interview questions for an HR round.

Job Role: {job_role}
Seniority Level: {level} (Junior/Mid/Senior)
Company Values: {company_values}
Industry: {industry}

Guidelines:
- Use STAR method-friendly questions (Situation, Task, Action, Result)
- Include questions about:
  1. Past teamwork or conflict resolution
  2. Handling failure or criticism
  3. Motivation for this role/company
  4. Career goals and growth mindset
  5. Work style and adaptability
  6. A situational judgment question

- Avoid yes/no questions
- Keep questions conversational and open-ended
- Adapt difficulty to seniority level

Output Format (return ONLY the numbered questions):
1. [Question]
2. [Question]
3. [Question]
4. [Question]
5. [Question]
6. [Question]"""


def get_question_generation_prompt(resume_skills, job_description, domain):
   """Compatibility wrapper for the existing AI service contract."""
   return get_hr_question_generation_prompt(job_role=domain, level="Mid", company_values="collaboration, innovation", industry=domain)


def get_answer_evaluation_prompt(question, answer_text, resume_summary, job_role="Software Developer", audio_metrics=None, video_metrics=None):
    """
    Comprehensive evaluation for Video HR Interview Round.
    Evaluates 17 parameters across Audio, Video, and Content.
    """
    audio_info = f"Audio Metrics: {audio_metrics}" if audio_metrics else "Audio metrics not available."
    video_info = f"Video Metrics: {video_metrics}" if video_metrics else "Video metrics not available."
    
    return f"""Analyze the following video interview response comprehensively.

INTERVIEW CONTEXT:
Question: {question}
Job Role: {job_role}

INPUT DATA:
1. Audio Transcript: {answer_text}
2. {audio_info}
3. {video_info}

ANALYZE EACH PARAMETER (0-10 Score + Explanation + Quote/Visual Evidence):

### Category 1: AUDIO/VOICE PARAMETERS (30% weight)
1. Vocal Confidence: Tone strength, steadiness, conviction.
2. Speech Fluency: Pace, pauses, filler words (um, uh, like).
3. Emotional Tone: Enthusiasm, sincerity, nervousness.
4. Voice Clarity: Articulation, pronunciation, audibility.
5. Tone Consistency: Emotional stability throughout.

### Category 2: VIDEO/VISUAL PARAMETERS (25% weight)
6. Body Language: Posture, gestures, openness.
7. Eye Contact: Camera engagement, confidence indicators.
8. Facial Expressions: Genuine emotions, matching verbal content.
9. Professional Appearance: Dress, background, lighting.
10. Engagement Level: Attentiveness, energy visible on camera.

### Category 3: CONTENT PARAMETERS (35% weight)
11. Communication Skills: Clarity, structure, professionalism.
12. Cultural Fit: Values alignment, teamwork orientation.
13. Motivation: Genuine interest, career goals.
14. Problem-Solving: Logical thinking, accountability.
15. Professional Maturity: Self-awareness, growth mindset.

### Category 4: RED FLAG ANALYSIS (10% penalty)
16. Behavioral Red Flags: Negativity, arrogance, blame-shifting.
17. Visual Red Flags: Unprofessional setting, distraction, disengagement.

Return your response in this EXACT JSON format:
{{
  "audio": {{
    "vocal_confidence": {{"score": 0, "explanation": ""}},
    "speech_fluency": {{"score": 0, "explanation": ""}},
    "emotional_tone": {{"score": 0, "explanation": ""}},
    "voice_clarity": {{"score": 0, "explanation": ""}},
    "tone_consistency": {{"score": 0, "explanation": ""}}
  }},
  "video": {{
    "body_language": {{"score": 0, "explanation": ""}},
    "eye_contact": {{"score": 0, "explanation": ""}},
    "facial_expressions": {{"score": 0, "explanation": ""}},
    "professional_appearance": {{"score": 0, "explanation": ""}},
    "engagement_level": {{"score": 0, "explanation": ""}}
  }},
  "content": {{
    "communication_skills": {{"score": 0, "explanation": ""}},
    "cultural_fit": {{"score": 0, "explanation": ""}},
    "motivation": {{"score": 0, "explanation": ""}},
    "problem_solving": {{"score": 0, "explanation": ""}},
    "professional_maturity": {{"score": 0, "explanation": ""}}
  }},
  "red_flags": {{
    "behavioral": {{"score": 0, "explanation": ""}},
    "visual": {{"score": 0, "explanation": ""}}
  }},
  "overall_answer_score": 0
}}"""


def get_video_hr_final_assessment_prompt(evaluations, job_role="Software Developer"):
    """
    Generate the final HR interview report based on multi-modal analysis.
    """
    eval_text = str(evaluations)
    
    return f"""Generate the comprehensive final HR video interview report.
 
AGGREGATE DATA from all questions: {eval_text}
Job Role: {job_role}
 
Tasks:
1. Calculate average scores for each category (Audio, Video, Content, Red Flags).
2. Calculate Overall HR Score (0-100) using:
   Overall Score = (Audio_Avg × 3.0) + (Video_Avg × 2.5) + (Content_Avg × 3.5) - (RedFlag_Penalty × 1.0)
3. Provide Final Recommendation: STRONG FIT / MODERATE FIT / POOR FIT
4. Summarize strengths and areas for improvement for each category.
5. Identify any specific red flags with evidence.
 
Return your response in this EXACT JSON format:
{{
  "audio_summary": {{
    "avg_score": 0,
    "strengths": [],
    "improvements": []
  }},
  "video_summary": {{
    "avg_score": 0,
    "strengths": [],
    "improvements": []
  }},
  "content_summary": {{
    "avg_score": 0,
    "strengths": [],
    "improvements": []
  }},
  "red_flag_report": {{
    "penalty": 0,
    "critical_concerns": [],
    "minor_concerns": []
  }},
  "overall_score": 0,
  "recommendation": "",
  "hiring_justification": "",
  "candidate_tips": []
}}"""


def get_final_scoring_prompt(evaluations, domain):
   """Compatibility wrapper for the existing AI service contract."""
   return get_video_hr_final_assessment_prompt(evaluations, job_role=domain)


# Sample HR Questions by Category
HR_QUESTIONS_BANK = {
    "teamwork": [
        "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
        "Describe a project where team collaboration was crucial to success."
    ],
    "failure_feedback": [
        "Tell me about a time you failed or made a significant mistake. What did you learn?",
        "How do you typically respond to constructive criticism?"
    ],
    "motivation": [
        "Why do you want to work for our company specifically?",
        "Where do you see yourself in 3-5 years?"
    ],
    "problem_solving": [
        "Describe a situation where you had to adapt to a major change at work.",
        "Tell me about a time you had conflicting priorities. How did you manage?"
    ],
    "work_ethic": [
        "What does 'professionalism' mean to you?",
        "Describe your ideal work environment."
    ],
    "situational": [
        "If you discovered a colleague taking credit for your work, what would you do?",
        "How would you handle a situation where your manager gave you impossible deadlines?"
    ]
}
