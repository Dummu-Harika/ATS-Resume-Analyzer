// API service for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8004';

export const api = {
    // Start interview session
    async startSession(data) {
        const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to start session');
        return response.json();
    },

    // Generate questions
    async generateQuestions(sessionId) {
        const response = await fetch(`${API_BASE_URL}/api/interview/generate-questions/${sessionId}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to generate questions');
        return response.json();
    },

    // Submit answer
    async submitAnswer(sessionId, questionId, transcribedText, durationSeconds) {
        const response = await fetch(`${API_BASE_URL}/api/interview/submit-answer/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: questionId,
                transcribed_text: transcribedText,
                duration_seconds: durationSeconds
            })
        });
        if (!response.ok) throw new Error('Failed to submit answer');
        return response.json();
    },

    // Get evaluation
    async getEvaluation(sessionId, questionNumber) {
        const response = await fetch(`${API_BASE_URL}/api/interview/evaluation/${sessionId}/${questionNumber}`);
        if (!response.ok) throw new Error('Failed to get evaluation');
        return response.json();
    },

    // Get final assessment
    async getFinalAssessment(sessionId) {
        const response = await fetch(`${API_BASE_URL}/api/interview/final-score/${sessionId}`);
        if (!response.ok) throw new Error('Failed to get final assessment');
        return response.json();
    },

    // Get all sessions (recruiter)
    async getAllSessions() {
        const response = await fetch(`${API_BASE_URL}/api/interview/sessions`);
        if (!response.ok) throw new Error('Failed to get sessions');
        return response.json();
    },

    // Get session details
    async getSessionDetails(sessionId) {
        const response = await fetch(`${API_BASE_URL}/api/interview/session/${sessionId}/details`);
        if (!response.ok) throw new Error('Failed to get session details');
        return response.json();
    }
};
