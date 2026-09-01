// TypeScript interfaces for Round 3 Voice Interview

export interface InterviewSession {
  id: number;
  candidate_name: string;
  candidate_email: string;
  domain: string;
  resume_skills: string;
  job_description: string;
  resume_summary?: string;
  created_at: string;
}

export interface InterviewSessionCreate {
  candidate_name: string;
  candidate_email: string;
  domain: string;
  resume_skills: string;
  job_description: string;
  resume_summary?: string;
}

export interface Question {
  question_number: number;
  question_text: string;
}

export interface ParameterScore {
  score: number;
  justification: string;
  key_phrases: string[];
}

export interface AnswerEvaluation {
  confidence: ParameterScore;
  evidence: ParameterScore;
  clarity: ParameterScore;
  arrogance: ParameterScore;
}

export interface AnswerSubmit {
  question_id: number;
  transcribed_text: string;
  duration_seconds?: number;
}

export interface FinalAssessment {
  avg_confidence: number;
  avg_evidence: number;
  avg_clarity: number;
  avg_arrogance: number;
  overall_score: number;
  recommendation: 'SELECT' | 'HOLD' | 'REJECT';
  explanation: string;
  improvement_areas: string[];
}

export interface SessionDetails {
  session: InterviewSession;
  questions: QuestionWithAnswer[];
  final_assessment: FinalAssessment | null;
}

export interface QuestionWithAnswer {
  question_number: number;
  question_text: string;
  answer: string | null;
  evaluation: AnswerEvaluation | null;
}
