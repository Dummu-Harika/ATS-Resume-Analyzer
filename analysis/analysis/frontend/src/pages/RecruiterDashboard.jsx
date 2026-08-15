import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await api.getAllSessions();
            setSessions(data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
            setLoading(false);
        }
    };

    const viewDetails = async (sessionId) => {
        try {
            const details = await api.getSessionDetails(sessionId);
            setSessionDetails(details);
            setSelectedSession(sessionId);
        } catch (err) {
            console.error('Failed to fetch session details:', err);
        }
    };

    const getRecommendationColor = (recommendation) => {
        switch (recommendation) {
            case 'SELECT': return '#10b981';
            case 'HOLD': return '#f59e0b';
            case 'REJECT': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const filteredSessions = sessions.filter(session => {
        if (filter === 'ALL') return true;
        // You would need to fetch assessment for each session to filter by recommendation
        return true;
    });

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading sessions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>Recruiter Dashboard</h1>
                    <p>Round 3 - HR Interview Results</p>
                </div>
                <button className="btn-back" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
            </header>

            <div className="filters">
                <button
                    className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilter('ALL')}
                >
                    All Candidates
                </button>
                <button
                    className={`filter-btn ${filter === 'SELECT' ? 'active' : ''}`}
                    onClick={() => setFilter('SELECT')}
                >
                    ✅ Selected
                </button>
                <button
                    className={`filter-btn ${filter === 'HOLD' ? 'active' : ''}`}
                    onClick={() => setFilter('HOLD')}
                >
                    ⏸️ On Hold
                </button>
                <button
                    className={`filter-btn ${filter === 'REJECT' ? 'active' : ''}`}
                    onClick={() => setFilter('REJECT')}
                >
                    ❌ Rejected
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="empty-state">
                    <h2>No interviews yet</h2>
                    <p>Candidates will appear here after completing Round 3 interviews.</p>
                </div>
            ) : (
                <div className="sessions-grid">
                    {filteredSessions.map(session => (
                        <div key={session.id} className="session-card">
                            <div className="session-header">
                                <h3>{session.candidate_name}</h3>
                                <span className="domain-badge">{session.domain}</span>
                            </div>
                            <p className="session-email">{session.candidate_email}</p>
                            <p className="session-date">
                                {new Date(session.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                            <button
                                className="btn-view-details"
                                onClick={() => viewDetails(session.id)}
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {sessionDetails && (
                <div className="modal-overlay" onClick={() => setSessionDetails(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSessionDetails(null)}>×</button>

                        <h2>{sessionDetails.session.candidate_name}</h2>
                        <p className="modal-domain">{sessionDetails.session.domain}</p>

                        {sessionDetails.final_assessment && (
                            <div className="modal-assessment">
                                <div className="assessment-score">
                                    <span className="score-large">{Math.round(sessionDetails.final_assessment.overall_score)}</span>
                                    <span className="score-label">/100</span>
                                </div>
                                <div
                                    className="assessment-badge"
                                    style={{ background: getRecommendationColor(sessionDetails.final_assessment.recommendation) }}
                                >
                                    {sessionDetails.final_assessment.recommendation}
                                </div>
                                <p className="assessment-explanation">{sessionDetails.final_assessment.explanation}</p>
                            </div>
                        )}

                        <div className="modal-questions">
                            <h3>Interview Questions & Answers</h3>
                            {sessionDetails.questions.map((q, idx) => (
                                <div key={idx} className="question-detail">
                                    <h4>Q{q.question_number}: {q.question_text}</h4>
                                    {q.answer ? (
                                        <>
                                            <p className="answer-text">{q.answer}</p>
                                            {q.evaluation && (
                                                <div className="mini-scores">
                                                    <span>💪 {q.evaluation.confidence.score.toFixed(1)}</span>
                                                    <span>📋 {q.evaluation.evidence.score.toFixed(1)}</span>
                                                    <span>💡 {q.evaluation.clarity.score.toFixed(1)}</span>
                                                    <span>⚠️ {q.evaluation.arrogance.score.toFixed(1)}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="no-answer">Not answered yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecruiterDashboard;
