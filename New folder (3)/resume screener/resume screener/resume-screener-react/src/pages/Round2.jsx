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
        return <div style={{ padding: '2rem' }}><Card><p>No Round 2 session specified.</p></Card></div>;
    }

    const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const seconds = String(timerSeconds % 60).padStart(2, '0');

    return (
        <div className="max-w-3xl mx-auto" style={{ padding: '2rem' }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Round 2</div>
                        <h2 style={{ margin: '0.25rem 0 0' }}>Technical Assessment</h2>
                    </div>
                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.6rem 0.9rem', minWidth: '120px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Time left</div>
                        <strong style={{ fontSize: '1.1rem' }}>{minutes}:{seconds}</strong>
                    </div>
                </div>

                {!finishedReport && question && (
                    <>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                <span>Progress</span>
                                <span>{questionIndex + 1} / {Math.max(questions.length, 1)}</span>
                            </div>
                            <div style={{ height: '10px', background: '#0f172a', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.max(8, progress)}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #38bdf8)', borderRadius: '999px' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '1rem 1.1rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Question {questionIndex + 1}</div>
                            <h3 style={{ margin: 0, lineHeight: 1.5 }}>{question.question}{question.id ? ` (Q#${question.id})` : ''}</h3>
                        </div>

                        {question.type === 'mcq' && question.options && question.options.length > 0 && (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {question.options.map((opt, idx) => (
                                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #334155', background: selected === opt ? 'rgba(59,130,246,0.14)' : '#0f172a', cursor: 'pointer' }}>
                                        <input type="radio" name="opt" value={opt} checked={selected === opt} onChange={() => setSelected(opt)} />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {question.type !== 'mcq' && (
                            <div>
                                <textarea value={selected} onChange={(e) => setSelected(e.target.value)} rows={7} style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '10px', padding: '0.9rem' }} placeholder="Type your answer here..." />
                            </div>
                        )}

                        {error && (
                            <div style={{ marginTop: '1rem', color: '#fca5a5', background: 'rgba(127, 29, 29, 0.35)', padding: '0.8rem 1rem', borderRadius: '10px' }}>{error}</div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <Button variant="outline" onClick={() => setSelected('')} disabled={loading}>Clear Answer</Button>
                                <Button variant="outline" onClick={() => handleSkip()} disabled={loading}>Skip Question</Button>
                            </div>
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Answer'}
                            </Button>
                        </div>
                    </>
                )}

                {!finishedReport && error && (
                    <div style={{ marginTop: '1rem', color: '#fca5a5', background: 'rgba(127, 29, 29, 0.35)', padding: '0.8rem 1rem', borderRadius: '10px' }}>{error}</div>
                )}

                {!finishedReport && !question && !error && (
                    <div style={{ color: '#e2e8f0' }}>Loading question...</div>
                )}

                {finishedReport && (
                    <div>
                        <h3>Assessment Complete</h3>
                        <p>Score: {finishedReport.percentage ?? finishedReport.totalScore}</p>
                        <p>Status: {finishedReport.isSelected ? 'Qualified' : 'Not Qualified'}</p>
                        <div style={{ whiteSpace: 'pre-wrap', background: '#0b1220', padding: '1rem', borderRadius: '8px', color: '#cbd5e1', marginTop: '1rem' }}>
                            {finishedReport.overallFeedback || finishedReport.summary || 'No feedback available.'}
                        </div>

                        {finishedReport.isSelected && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <Button
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
                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                                >
                                    Proceed to Round 3
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
