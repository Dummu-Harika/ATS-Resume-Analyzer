import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitRound2Answer } from '../api';
import { Card, Button } from '../components/Shared';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const getRound2ErrorMessage = (message) => {
    const text = String(message || '').toLowerCase();
    if (text.includes('quiz session not found') || text.includes('session not found') || text.includes('expired') || text.includes('invalid')) {
        return 'This Round 2 session has expired or is invalid. Please return to the application and start Round 2 again.';
    }
    if (text.includes('failed to fetch') || text.includes('network') || text.includes('service unavailable')) {
        return 'The Round 2 service is currently unavailable. Please try again in a moment.';
    }
    return 'Unable to continue Round 2 right now. Please try again.';
};

export default function Round2() {
    const query = useQuery();
    const navigate = useNavigate();
    const sessionId = query.get('session_id');

    const [questions, setQuestions] = useState([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [question, setQuestion] = useState(null);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [finishedReport, setFinishedReport] = useState(null);
    const [error, setError] = useState('');
    const [timerSeconds, setTimerSeconds] = useState(25 * 60);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        // Always fetch the live question for the active session. The round2 session state
        // can advance while the browser holds stale localStorage values from an earlier visit.
        const storedKey = `round2_initial_${sessionId}`;
        try {
            sessionStorage.removeItem(storedKey);
        } catch (e) {
            // ignore storage errors; the backend is the source of truth
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fetchInitial = async () => {
            if (loadingInitial) return;
            setLoadingInitial(true);
            try {
                const res = await fetch(`${API_URL}/round2/question?session_id=${encodeURIComponent(sessionId)}`);
                if (!res.ok) {
                    let detail = '';
                    try {
                        const payload = await res.json();
                        detail = payload?.detail || JSON.stringify(payload);
                    } catch (e) {
                        detail = await res.text();
                    }
                    if (res.status === 404) {
                        setError(getRound2ErrorMessage(detail || 'Session not found'));
                    } else {
                        setError('The Round 2 service is currently unavailable. Please try again in a moment.');
                    }
                    return;
                }
                const data = await res.json();
                const q = data.next_question || null;
                if (q) {
                    setQuestion(q);
                    setQuestions([q]);
                } else if (data.report) {
                    setFinishedReport(data.report);
                } else {
                    setError('No initial question found for this session.');
                }
            } catch (err) {
                setError('Network error fetching initial question: ' + (err.message || err) + '. Check that backend services are running and VITE_API_URL is correct.');
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchInitial();
    }, [sessionId]);

    useEffect(() => {
        if (finishedReport || !sessionId) return;
        const timer = setInterval(() => {
            setTimerSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!loading && !submitted) {
                        window.alert('Time is up. Your current answer will be submitted automatically.');
                        handleAutoSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [finishedReport, loading, sessionId, submitted]);

    const progress = useMemo(() => {
        if (!questions.length) return 0;
        return ((questionIndex + 1) / questions.length) * 100;
    }, [questionIndex, questions.length]);

    const persistAnswer = (currentQuestion, value) => {
        if (!sessionId) return;
        const key = `round2_answers_${sessionId}`;
        try {
            const current = JSON.parse(sessionStorage.getItem(key) || '{}');
            current[currentQuestion?.id || 'current'] = value;
            sessionStorage.setItem(key, JSON.stringify(current));
        } catch (e) {
            // ignore storage errors; the API still handles the candidate answer
        }
    };

    const handleAutoSubmit = async () => {
        if (!question || loading || submitted) return;
        const answerValue = selected || '(Candidate Skipped)';
        persistAnswer(question, answerValue);
        setSubmitted(true);
        setLoading(true);
        try {
            const res = await submitRound2Answer({ session_id: sessionId, answer: answerValue });
            if (res.next_question) {
                setQuestion(res.next_question);
                setSelected(sessionStorage.getItem(`round2_answers_${sessionId}`) ? JSON.parse(sessionStorage.getItem(`round2_answers_${sessionId}`))[res.next_question.id] || '' : '');
                setQuestions((prev) => [...prev, res.next_question]);
                setQuestionIndex((prev) => prev + 1);
            } else if (res.report) {
                setFinishedReport(res.report);
            }
        } catch (err) {
            const msg = err?.message || err;
            setError(getRound2ErrorMessage(msg));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!question || loading || submitted) return;
        const answerValue = selected || '(Candidate Skipped)';
        persistAnswer(question, answerValue);
        setSubmitted(true);
        setLoading(true);
        setError('');
        try {
            const res = await submitRound2Answer({ session_id: sessionId, answer: answerValue });
            if (res.next_question) {
                setQuestion(res.next_question);
                setSelected('');
                setQuestionIndex((prev) => prev + 1);
                setQuestions((prev) => [...prev, res.next_question]);
            } else if (res.report) {
                setFinishedReport(res.report);
            }
        } catch (err) {
            const msg = err?.message || err;
            setError(getRound2ErrorMessage(msg));
        } finally {
            setLoading(false);
            setSubmitted(false);
        }
    };

    const handleSkip = async () => {
        // Submit the current question as skipped and advance immediately
        if (!question || loading) return;
        const answerValue = '(Candidate Skipped)';
        persistAnswer(question, answerValue);
        setSubmitted(true);
        setLoading(true);
        setError('');
        try {
            const res = await submitRound2Answer({ session_id: sessionId, answer: answerValue });
            if (res.next_question) {
                setQuestion(res.next_question);
                setSelected('');
                setQuestionIndex((prev) => prev + 1);
                setQuestions((prev) => [...prev, res.next_question]);
            } else if (res.report) {
                setFinishedReport(res.report);
            }
        } catch (err) {
            const msg = err?.message || err;
            setError(getRound2ErrorMessage(msg));
        } finally {
            setLoading(false);
            setSubmitted(false);
        }
    };

    if (!sessionId) {
        return (
            <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '1rem' }}>
                <Card className="card-glow-accent fade-in" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Terminal size={28} />
                    </div>
                    <h2 style={{ marginBottom: '8px' }}>Round 2 Technical Evaluation</h2>
                    <p style={{ color: '#94a3b8', maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.92rem' }}>
                        To participate in the Round 2 Technical Assessment, please complete the Round 1 Resume Screening first.
                    </p>
                    <Button variant="primary" onClick={() => navigate('/')}>
                        ← Go to Candidate Portal
                    </Button>
                </Card>
            </div>
        );
    }

    const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const seconds = String(timerSeconds % 60).padStart(2, '0');

    return (
        <div className="fade-in" style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '3rem' }}>
            <Card className="card-glow-accent">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="badge-pill badge-active">Round 2: Technical</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Session: #{sessionId.slice(0, 8)}</span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.65rem' }}>Technical Proficiency Assessment</h2>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.5rem 1rem', minWidth: '130px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Remaining</div>
                        <strong style={{ fontSize: '1.2rem', color: timerSeconds < 300 ? '#f87171' : '#38bdf8', fontFamily: 'monospace' }}>
                            {minutes}:{seconds}
                        </strong>
                    </div>
                </div>

                {!finishedReport && question && (
                    <>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                <span>Question {questionIndex + 1} of 15</span>
                                <span>{Math.round(Math.min(100, ((questionIndex + 1) / 15) * 100))}% Completed</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.max(6, ((questionIndex + 1) / 15) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #38bdf8)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                            </div>
                        </div>

                        {/* Question Box */}
                        <div style={{ marginBottom: '1.25rem', padding: '1.25rem 1.4rem', borderRadius: '14px', background: 'rgba(11, 17, 33, 0.85)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ color: '#818cf8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {question.type ? question.type.replace('_', ' ').toUpperCase() : 'TECHNICAL QUESTION'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>10 Points</span>
                            </div>
                            <h3 style={{ margin: 0, lineHeight: 1.5, fontSize: '1.15rem', color: '#f8fafc' }}>
                                {question.question}
                            </h3>
                        </div>

                        {/* MCQ Options */}
                        {question.type === 'mcq' && question.options && question.options.length > 0 && (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {question.options.map((opt, idx) => (
                                    <label
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.85rem',
                                            padding: '1rem 1.15rem',
                                            borderRadius: '12px',
                                            border: selected === opt ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: selected === opt ? 'rgba(99, 102, 241, 0.16)' : 'rgba(15, 23, 42, 0.6)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="opt"
                                            value={opt}
                                            checked={selected === opt}
                                            onChange={() => setSelected(opt)}
                                            style={{ accentColor: '#6366f1' }}
                                        />
                                        <span style={{ fontSize: '0.92rem', color: selected === opt ? '#ffffff' : '#cbd5e1' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Open ended text response */}
                        {question.type !== 'mcq' && (
                            <div>
                                <textarea
                                    value={selected}
                                    onChange={(e) => setSelected(e.target.value)}
                                    rows={7}
                                    style={{ width: '100%', background: 'rgba(11, 17, 33, 0.9)', color: '#f8fafc', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.92rem', lineHeight: 1.6 }}
                                    placeholder="Type your technical solution or code implementation here..."
                                />
                            </div>
                        )}

                        {error && (
                            <div style={{ marginTop: '1rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.8rem 1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <Button variant="outline" className="btn-sm" onClick={() => setSelected('')} disabled={loading}>
                                    Clear
                                </Button>
                                <Button variant="outline" className="btn-sm" onClick={() => handleSkip()} disabled={loading}>
                                    Skip Question
                                </Button>
                            </div>
                            <Button variant="primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: '150px' }}>
                                {loading ? 'Submitting...' : 'Submit & Next →'}
                            </Button>
                        </div>
                    </>
                )}

                {!finishedReport && !question && !error && (
                    <div style={{ color: '#cbd5e1', textAlign: 'center', padding: '2rem' }}>
                        Loading next technical challenge...
                    </div>
                )}

                {/* FINISHED REPORT */}
                {finishedReport && (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div className="score-circle" style={{
                            '--percentage': `${finishedReport.percentage ?? finishedReport.totalScore}%`,
                            color: finishedReport.isSelected ? '#10b981' : '#ef4444',
                            width: '100px',
                            height: '100px',
                            fontSize: '2rem'
                        }}>
                            <span className="score-value">{Math.round(finishedReport.percentage ?? finishedReport.totalScore)}%</span>
                        </div>

                        <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>
                            {finishedReport.isSelected ? '🎉 Qualified for Round 3!' : 'Technical Assessment Completed'}
                        </h2>

                        <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
                            <span className={`badge-pill ${finishedReport.isSelected ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                                Status: {finishedReport.isSelected ? 'QUALIFIED (>= 70%)' : 'NOT QUALIFIED (< 70%)'}
                            </span>
                        </div>

                        <div style={{ textAlign: 'left', background: 'rgba(15, 23, 42, 0.85)', padding: '1.25rem', borderRadius: '12px', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.92rem' }}>
                            {finishedReport.overallFeedback || finishedReport.summary || 'Assessment evaluation complete. Candidate demonstrated competency across standard engineering questions.'}
                        </div>

                        {finishedReport.isSelected && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        const candidateId = sessionStorage.getItem('current_candidate_id') || sessionStorage.getItem('round2_candidate_id');
                                        if (candidateId) {
                                            sessionStorage.setItem('current_candidate_id', candidateId);
                                            sessionStorage.setItem('round3_candidate_id', candidateId);
                                            navigate(`/round3?candidate_id=${encodeURIComponent(candidateId)}`);
                                        } else {
                                            navigate('/round3');
                                        }
                                    }}
                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                >
                                    🚀 Proceed to Round 3: AI Voice & Video Interview →
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
