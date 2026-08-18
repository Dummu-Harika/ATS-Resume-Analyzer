import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitRound2Answer } from '../api';
import { Card, Button } from '../components/Shared';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function Round2() {
    const query = useQuery();
    const navigate = useNavigate();
    const sessionId = query.get('session_id');

    const [questions, setQuestions] = useState([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [question, setQuestion] = useState(null);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);
    const [finishedReport, setFinishedReport] = useState(null);
    const [error, setError] = useState('');
    const [timerSeconds, setTimerSeconds] = useState(25 * 60);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!sessionId) return;
        const stored = sessionStorage.getItem(`round2_initial_${sessionId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setQuestion(parsed);
                setQuestions([parsed]);
            } catch (e) {
                setError('Unable to load the saved question. Please restart Round 2.');
            }
        }
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
            setError('Failed to submit your answer. Please try again.');
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
            setError('Submission failed: ' + (err.message || err));
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
                            <h3 style={{ margin: 0, lineHeight: 1.5 }}>{question.question}</h3>
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
                            <Button variant="outline" onClick={() => setSelected('')} disabled={loading}>Clear Answer</Button>
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Answer'}
                            </Button>
                        </div>
                    </>
                )}

                {!finishedReport && !question && (
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
