import re
import math
import asyncio
import os
from backend.config import JOB_ROLES

class StructuralExtractor:
    def __init__(self, text, filename, role_skills):
        self.text = text
        self.filename = filename
        self.text_lower = text.lower()
        self.role_skills = role_skills

    def extract(self):
        # Cache common checks
        lines = self.text.split('\n')
        useful_lines = [l.strip() for l in lines if l.strip()]
        
        return {
            "skills": self._extract_skills(),
            "experience": self._extract_experience(useful_lines),
            "education": self._extract_education(),
            "certifications": self._extract_certifications(useful_lines),
            "projects": self._extract_projects(),
            "ats_quality": self._extract_ats_quality()
        }

    def _extract_skills(self):
        # OPTIMIZATION: Use flexible boundaries to support C++, Node.js, etc.
        search_space = set(self.role_skills)
        search_space.update([
            "AWS", "Azure", "Docker", "Kubernetes", "C++", "Java", "Python", "SQL", "Git", "React", 
            "Node.js", "Express.js", "MongoDB", "PostgreSQL", "JavaScript", "HTML", "CSS", "TypeScript",
            "Linux", "Shell", "Agile", "Scrum", "Django", "Flask", "Spring", "Angular", "Vue.js", "Core Java", "J2EE", "Hibernate"
        ])
        
        found = []
        for skill in search_space:
            # Escape skill for regex
            s_esc = re.escape(skill)
            # Use lookbehind/lookahead for boundaries that don't fail on non-word chars
            # This matches 'skill' if it's not preceded or followed by a word character
            pattern = rf"(?i)(?<!\w){s_esc}(?!\w)"
            if re.search(pattern, self.text):
                found.append(skill)
        
        return list(set(found))

    def _extract_experience(self, lines):
        # Faster year extraction
        years = re.findall(r'\b(19|20)\d{2}\b', self.text)
        sorted_years = sorted([int(y) for y in years])
        total_years = sorted_years[-1] - sorted_years[0] if len(sorted_years) >= 2 else 0
        
        titles_found = []
        known_titles = ["developer", "engineer", "analyst", "manager", "intern"]
        for line in lines[:20]: # Only check top of resume for headers
            l_lower = line.lower()
            if any(t in l_lower for t in known_titles) and len(line) < 50:
                titles_found.append({"title": line, "skills_used": [], "duration_months": 12})
        
        if not titles_found:
             titles_found.append({"title": "Candidate", "skills_used": [], "duration_months": int(total_years * 12)})

        return {"total_years": max(0, total_years), "roles": titles_found}

    def _extract_education(self):
        # Extremely fast checks
        deg = "B.Tech" if "tech" in self.text_lower or "bachelor" in self.text_lower else "Unknown"
        branch = "CSE" if "computer" in self.text_lower or "cse" in self.text_lower or "it" in self.text_lower else "Unknown"
        return {"degree": deg, "branch": branch}

    def _extract_certifications(self, lines):
        return [l for l in lines if "certif" in l.lower() and len(l) < 80][:3]

    def _extract_projects(self):
        # Minimal extraction
        return [{"title": "Projects", "tools": ["Tech"], "domain": "IT"}] if "project" in self.text_lower else []

    def _extract_ats_quality(self):
        return {
            "readable": True,
            "sections_detected": "skill" in self.text_lower and "edu" in self.text_lower,
            "keyword_density": 0.08,
            "format": "PDF" if self.filename.endswith(".pdf") else "DOCX"
        }

from backend.utils.ai_analyzer import GeminiAnalyzer

class DepthAnalyzer:
    def __init__(self, ai_api_key=None):
        self.job_roles = JOB_ROLES
        self.ai_analyzer = GeminiAnalyzer(ai_api_key) if ai_api_key else None

    async def analyze(self, text, raw_role, filename):
        target_role = raw_role
        job_config = self.job_roles.get(target_role, {})
        req_skills = job_config.get('skills_required', [])
        
        job = {
            "required_skills": req_skills,
            "preferred_skills": [],
            "min_experience": 2,
            "job_domain": "AI" if "AI" in target_role or "Data" in target_role else "Web", 
            "education_required": {"degree": "B.Tech", "branch": ["CSE", "IT"]}
        }
        
        extractor = StructuralExtractor(text, filename, req_skills)
        async def run_ai_analysis():
            try:
                return await asyncio.wait_for(
                    self.ai_analyzer.analyze_resume_semantically(text, target_role, filename),
                    timeout=self.ai_analyzer.timeout_seconds
                )
            except asyncio.TimeoutError:
                print(f"DEBUG: AI Analysis timed out for '{filename}'")
                return None
            except Exception as e:
                print(f"DEBUG: AI Analysis failed for '{filename}': {e}")
                return None

        # Run extraction and AI analysis in parallel for maximum speed
        tasks = [asyncio.to_thread(extractor.extract)]
        if self.ai_analyzer:
            tasks.append(run_ai_analysis())
            
        results = await asyncio.gather(*tasks)
        resume = results[0]
        ai_result = results[1] if len(results) > 1 else None
        
        # Explicit type check to prevent AttributeError if AI returns a string or list
        if ai_result and isinstance(ai_result, dict):
            # AI is the primary source of truth now per user request
            final_score = ai_result.get("final_score", 0)
            breakdown = ai_result.get("breakdown", {})
            
            # Map AI breakdown to legacy frontend keys
            mapped_breakdown = {
                "skills": breakdown.get("skills_match", 60),
                "experience": breakdown.get("experience_relevance", 60),
                "education": breakdown.get("education", 60),
                "projects": 60, 
                "format": breakdown.get("presentation", 60)
            }
            
            return {
                "parameter_scores": mapped_breakdown,
                "final_score": final_score,
                "decision": "Shortlist" if final_score > 60 else "Hold" if final_score >= 40 else "Reject",
                "breakdown": mapped_breakdown,
                "feedback": {
                    "skills": "AI evaluated skills match.",
                    "experience": "AI evaluated experience quality.",
                    "education": "AI evaluated education details.",
                    "projects": "AI evaluated technical projects.",
                    "ats": "AI evaluated resume formatting."
                },
                "ai_analysis": ai_result,
                "recommendation": str(ai_result.get("recommendation", "HOLD")).upper() if ai_result else "HOLD",
                "recommendation_reasoning": ai_result.get("recommendation_reasoning", "Analysis complete.") if ai_result else "Analysis complete.",
                "final_report": ai_result.get("final_report", {}),
                "role": target_role,
                "matched_skills": list(set(resume["skills"]) & set(job["required_skills"])),
                "missing_skills": list(set(job["required_skills"]) - set(resume["skills"]))
            }

        # Fallback to rules if AI fails
        rules_result = self.calculate_final_score(resume, job)
        feedback = self.generate_feedback(rules_result["parameter_scores"], resume, job)
        
        # Create a rule-based comprehensive report as fallback
        fallback_report = {
            "executive_summary": f"Rule-based assessment completed. The candidate scored {rules_result['final_score']}% for the {target_role} role.",
            "category_analysis": {
                "skills": {
                    "status": "Strength" if rules_result["parameter_scores"]["skills"] > 70 else "Gap",
                    "strengths": [f"Matched {len(list(set(resume['skills']) & set(job['required_skills'])))} key skills"],
                    "weaknesses": [f"Missing {len(list(set(job['required_skills']) - set(resume['skills'])))} required skills"],
                    "recommendations": ["Focus on learning missing technical skills.", "Update skills section with proficiency levels."]
                },
                "experience": {
                    "status": "Strength" if rules_result["parameter_scores"]["experience"] > 70 else "Gap",
                    "strengths": [f"{resume['experience']['total_years']} years of total experience"],
                    "weaknesses": ["Relevant industry experience could be highlighted more."],
                    "recommendations": ["Quantify achievements with metrics.", "Clarify roles and responsibilities."]
                },
                "education": {
                    "status": "Strength" if rules_result["parameter_scores"]["education"] > 100 else "Gap",
                    "strengths": [f"Degree: {resume['education']['degree']}"],
                    "weaknesses": ["Consider adding relevant certifications."],
                    "recommendations": ["Highlight specialized coursework."]
                }
            },
            "skills_gap_analysis": {
                "high_priority_missing": list(set(job["required_skills"]) - set(resume["skills"]))[:3],
                "medium_priority_missing": list(set(job["required_skills"]) - set(resume["skills"]))[3:6],
                "learning_roadmap": ["Complete online courses for missing tech.", "Build 2 small projects using new stack."]
            },
            "experience_enhancement": ["Use STAR method for bullets.", "Include impact numbers ($ or %)."],
            "project_showcase_tips": ["Add GitHub links.", "Describe the tools used clearly."],
            "ats_optimization_checklist": ["Use standard headings.", "Remove complex formatting.", "Target keyword density."],
            "action_plan": [
                f"Obtain {list(set(job['required_skills']) - set(resume['skills']))[0] if (set(job['required_skills']) - set(resume['skills'])) else 'further'} certification.",
                "Rewrite experience bullets to include results.",
                "Update projects with links to source code.",
                "Ensure skills keywords are easily scannable."
            ]
        }

        return {
            "parameter_scores": rules_result["parameter_scores"],
            "final_score": rules_result["final_score"],
            "decision": rules_result["decision"],
            "breakdown": rules_result["breakdown"],
            "feedback": feedback,
            "recommendation": rules_result["decision"].upper(),
            "recommendation_reasoning": f"Rule-based assessment based on {len(resume['skills'])} matched skills and {resume['experience']['total_years']} years of experience.",
            "final_report": fallback_report,
            "role": target_role,
            "matched_skills": list(set(resume["skills"]) & set(job["required_skills"])),
            "missing_skills": list(set(job["required_skills"]) - set(resume["skills"]))
        }

    # ==============================
    # DEPTH-BASED SCORING LOGIC (User Provided)
    # ==============================

    def score_skills(self, resume, job):
        matched = set(resume["skills"]) & set(job["required_skills"])
        if not job["required_skills"]: return 0
        presence = len(matched) / len(job["required_skills"])

        context = 0
        # Guard against missing roles/skills_used
        if resume["experience"]["roles"]:
            for role in resume["experience"]["roles"]:
                # If skills_used is empty (extractor limitation), assume some skills based on match
                used = role.get("skills_used", []) 
                # If extraction failed to map skills to roles, we might assume global matched skills apply
                # to at least one role to be fair to the user's parsing limitations
                if not used: used = list(matched)
                
                context += len(set(used) & matched)
            context = min(context / len(job["required_skills"]), 1)
        
        frequency = min(len(resume["skills"]) / len(job["required_skills"]), 1)

        # Balanced weights for skills
        score = (
            presence * 0.60 + # Increased weight on presence
            context * 0.20 +  # Reduced weight on role-mapping (hard to parse)
            frequency * 0.20  # Total skills count importance
        ) * 100
        
        # Apply a curve (sqrt) to be more generous to "mostly good" candidates
        score = math.sqrt(score / 100) * 100
        return round(score, 2)

    def score_experience(self, resume, job):
        years_ratio = min(resume["experience"]["total_years"] / job["min_experience"], 1)

        titles = [r["title"].lower() for r in resume["experience"]["roles"]]
        role_match = 1 if any("engineer" in t or "analyst" in t or "developer" in t for t in titles) else 0.6

        # Guard for skills used
        skill_usage = sum(len(r.get("skills_used", [])) for r in resume["experience"]["roles"])
        skill_usage = min(skill_usage / 10, 1)

        stability = sum(r.get("duration_months", 0) for r in resume["experience"]["roles"])
        stability = min(stability / 24, 1)

        # Experience scoring adjustment
        score = (
            years_ratio * 0.50 + # Years matter most
            role_match * 0.30 +   # Title match
            skill_usage * 0.10 +  # Reduced weight as extraction is fuzzy
            stability * 0.10
        ) * 100
        return round(max(score, 30), 2) # Base score for any experience

    def score_education(self, resume, job):
        edu = resume["education"]
        req = job["education_required"]

        degree_match = 1 if edu["degree"] == req["degree"] else 0.5
        branch_match = 1 if edu["branch"] in req["branch"] else 0.6
        cert_match = min(len(resume["certifications"]) / 2, 1)
        recency = 1

        score = (
            degree_match * 0.40 +
            branch_match * 0.30 +
            cert_match * 0.20 +
            recency * 0.10
        ) * 100
        return round(score, 2)

    def score_projects(self, resume, job):
        impact_keywords = ["developed", "implemented", "deployed", "optimized", "automated"]
        if not resume["projects"]:
            return 0
            
        project = resume["projects"][0]

        domain_match = 1 if project.get("domain") == job["job_domain"] else 0.6
        tech_depth = min(len(project.get("tools", [])) / 4, 1)
        complexity = 1 if len(project.get("tools", [])) >= 4 else 0.6

        impact_count = sum(1 for k in impact_keywords if k in project.get("description", "").lower())
        impact = min(impact_count / 3, 1)

        score = (
            domain_match * 0.35 +
            tech_depth * 0.30 +
            complexity * 0.20 +
            impact * 0.15
        ) * 100
        return round(score, 2)

    def score_ats(self, resume):
        ats = resume["ats_quality"]
        readability = 1 if ats["readable"] else 0.5
        sections = 1 if ats["sections_detected"] else 0.5
        keyword_score = 1 if 0.05 <= ats["keyword_density"] <= 0.12 else 0.6
        format_health = 1 if ats["format"] in ["PDF", "DOCX"] else 0.5

        score = (
            readability * 0.35 +
            sections * 0.30 +
            keyword_score * 0.20 +
            format_health * 0.15
        ) * 100
        return round(score, 2)

    def calculate_final_score(self, resume, job):
        scores = {
            "skills": self.score_skills(resume, job),
            "experience": self.score_experience(resume, job),
            "education": self.score_education(resume, job),
            "projects": self.score_projects(resume, job),
            "ats": self.score_ats(resume)
        }

        final = (
            scores["skills"] * 0.40 +
            scores["experience"] * 0.25 +
            scores["education"] * 0.15 +
            scores["projects"] * 0.10 +
            scores["ats"] * 0.10
        )

        return {
            "parameter_scores": scores,
            "final_score": round(final, 2),
            "decision": "Shortlist" if final > 60 else "Hold" if final >= 40 else "Reject",
            # Pass raw breakdown for existing frontend compatibility if needed, though we'll update frontend
            "breakdown": {
                "skills": scores["skills"],
                "experience": scores["experience"],
                "education": scores["education"],
                "projects": scores["projects"],
                "format": scores["ats"] # Mapping ATS to Format for legacy
            }
        }

    def generate_feedback(self, scores, resume, job):
        feedback = {}
        
        # Skills
        missing = set(job["required_skills"]) - set(resume["skills"])
        if scores["skills"] < 100:
            msg = f"Found {len(resume['skills'])} matching skills. "
            if missing: msg += f"Missing: {', '.join(list(missing)[:3])}..."
            feedback["skills"] = msg
        else:
            feedback["skills"] = "Excellent skill match."

        # Experience
        if scores["experience"] < 100:
            reasons = []
            if resume["experience"]["total_years"] < job["min_experience"]:
                reasons.append(f"Exp {resume['experience']['total_years']}y < Min {job['min_experience']}y")
            if not resume["experience"]["roles"]:
                reasons.append("No clear roles detected")
            feedback["experience"] = " / ".join(reasons) if reasons else "Could identify more relevant role details."
        else:
            feedback["experience"] = "experience meets requirements."

        # Education
        if scores["education"] < 100:
            deg = resume["education"]["degree"]
            feedback["education"] = f"Degree detected: {deg}. Preferred: {job['education_required']['degree']}."
        else:
            feedback["education"] = "Education matches requirements."

        # Projects
        if scores["projects"] < 50:
            feedback["projects"] = "No strong project section detected or lacks keywords."
        else:
            feedback["projects"] = "Project section detected with relevant keywords."

        # ATS
        feedback["ats"] = f"Format: {resume['ats_quality']['format']}. Sections detected: {resume['ats_quality']['sections_detected']}."
        
        return feedback
