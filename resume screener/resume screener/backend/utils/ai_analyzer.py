import os
import ssl
import certifi
import json
from google import genai
from google.genai import types

# Fix SSL verification issue for restricted environments
os.environ['SSL_CERT_FILE'] = certifi.where()
ssl._create_default_https_context = ssl._create_unverified_context

class GeminiAnalyzer:
    def __init__(self, api_key):
        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-2.0-flash"

    async def analyze_resume_semantically(self, text, role, filename):
        prompt = f"""
Analyze this resume for the role of {role}. 

Resume: {text[:4000]}

Return ONLY valid JSON with this structure:
{{
  "final_score": 0-100,
  "breakdown": {{ "skills_match": 0-100, "experience_relevance": 0-100, "education": 0-100, "presentation": 0-100 }},
  "strengths": ["list"],
  "weaknesses": ["list"],
  "improvements": ["list"],
  "recommendation": "SHORTLIST/HOLD/REJECT",
  "recommendation_reasoning": "string",
  "final_report": {{
    "executive_summary": "3-4 sentences",
    "category_analysis": {{
      "skills": {{ "status": "string", "strengths": [], "weaknesses": [], "recommendations": [] }},
      "experience": {{ "status": "string", "strengths": [], "weaknesses": [], "recommendations": [] }},
      "education": {{ "status": "string", "strengths": [], "weaknesses": [], "recommendations": [] }},
      "presentation": {{ "status": "string", "strengths": [], "weaknesses": [], "recommendations": [] }}
    }},
    "skills_gap_analysis": {{ "high_priority_missing": [], "medium_priority_missing": [], "learning_roadmap": [] }},
    "experience_enhancement": [],
    "project_showcase_tips": [],
    "ats_optimization_checklist": [],
    "action_plan": ["5-7 prioritized steps"]
  }}
}}

Guidelines:
1. Be specific and factual.
2. Focus on role alignment.
3. Ensure valid JSON format.

Scoring calibration:
- 61-100: SHORTLIST (Qualified for next round)
- 40-60: HOLD (Potentially qualified, need review)
- 0-39: REJECT (Does not meet minimum requirements)
"""
        
        try:
            # Replaced thinking config and tools with standard config to avoid errors in restricted environments
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )

            content = response.text
            if not content:
                # Handle cases where thinking models return content in parts or different fields
                return None
                
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(content[start:end])
            return None
        except Exception as e:
            print(f"Gemini V3 Error: {e}")
            return None
