import { useEffect } from 'react';

export default function Results({ report, candidateId, candidateName, field, onRestart }) {
    useEffect(() => {
        const updateScore = async () => {
            if (!candidateId) return;
            try {
                await fetch('http://localhost:8000/update_quiz_score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: candidateId,
                        quiz_score: report.percentage
                    })
                });
                console.log("Quiz score updated for", candidateId);
            } catch (err) {
                console.error("Failed to update quiz score", err);
            }
        };
        updateScore();
    }, [candidateId, report.percentage]);

    return (

        <div className="fade-in">
            <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2>Assessment Complete</h2>
                <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: '1rem 0', color: report.percentage >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                    {report.totalScore.toFixed(0)} <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>/ 175</span>
                </div>
                <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Score: {report.percentage.toFixed(1)}%
                </div>
                <p style={{ marginTop: '1rem', color: '#cbd5e1' }}>{report.overallFeedback}</p>

                {report.percentage >= 70 && (
                    <a
                        href={`http://localhost:5175/?name=${encodeURIComponent(candidateName || 'Candidate')}&domain=${encodeURIComponent(field || 'General')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                        style={{ display: 'inline-block', marginTop: '1.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', marginRight: '1rem', textDecoration: 'none' }}
                    >
                        🎤 Proceed to Voice Interview (Round 3)
                    </a>
                )}

                <button className="btn" onClick={onRestart} style={{ marginTop: '1.5rem' }}>
                    Take Another Quiz
                </button>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Detailed Review</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {report.results.map((res, i) => (
                    <div key={res.questionId} className="glass-card" style={{
                        padding: '1.5rem',
                        borderLeft: res.isCorrect ? '5px solid var(--success)' : (res.pointsAwarded > 0 ? '5px solid var(--warning)' : '5px solid var(--error)')
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>Question {i + 1}</span>
                            <span style={{ fontWeight: 'bold', color: res.isCorrect ? 'var(--success)' : (res.pointsAwarded > 0 ? 'var(--warning)' : 'var(--error)') }}>
                                {res.pointsAwarded} / {res.maxPoints} Pts
                            </span>
                        </div>

                        <p style={{ margin: '0.8rem 0' }}>{res.question || `Question #${res.questionId}`}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.9rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Your Answer:</span>
                                <div style={{ color: res.isCorrect ? 'var(--success)' : (res.pointsAwarded > 0 ? 'var(--warning)' : 'var(--error)'), fontWeight: 'bold', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                    {res.userAnswer || '(No Answer)'}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Feedback:</span>
                                <div style={{ color: '#cbd5e1' }}>
                                    {res.feedback}
                                </div>
                            </div>

                            {!res.isCorrect && res.correctAnswer && (
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Correct Answer:</span>
                                    <div style={{ color: 'var(--success)', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
                                        {res.correctAnswer}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

    )
}
