import { useState } from 'react'

export default function Interview({ sessionId, field, initialQuestion, onFinish }) {
    const [currentQuestion, setCurrentQuestion] = useState(initialQuestion)
    const [currentAnswer, setCurrentAnswer] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [index, setIndex] = useState(0)
    const maxQuestions = 20

    const handleAnswerChange = (val) => {
        setCurrentAnswer(val)
    }

    const skipQuestion = () => {
        nextQuestion("(Candidate Skipped)")
    }

    const nextQuestion = async (forcedAnswer = null) => {
        const answerToSubmit = forcedAnswer || currentAnswer;
        if (!answerToSubmit.trim()) return alert("Please select or type an answer.")

        setSubmitting(true)
        try {
            const response = await fetch('http://localhost:8001/submit_answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    answer: answerToSubmit
                })
            })
            const data = await response.json()

            if (index + 1 < maxQuestions) {
                setCurrentQuestion(data.next_question)
                setCurrentAnswer('')
                setIndex(prev => prev + 1)
            } else {
                // We reached the end
                if (data.report) {
                    onFinish(data.report)
                } else {
                    // Fallback if the report wasn't in the last submit_answer response
                    await submitFinal()
                }
            }
        } catch (err) {
            console.error(err)
            alert("Failed to fetch next question. Check connection.")
        } finally {
            setSubmitting(false)
        }
    }

    const submitFinal = async () => {
        setSubmitting(true)
        try {
            // This might be called if for some reason the last submit_answer didn't return a report
            // Our backend main.py logic should return it though.
            const response = await fetch('http://localhost:8001/submit_answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    answer: currentAnswer // Redundant but avoids 422 if endpoint expects it
                })
            })
            const data = await response.json()
            if (data.report) {
                onFinish(data.report)
            } else {
                alert("Assessment complete but failed to retrieve final report.")
            }
        } catch (err) {
            console.error(err)
            alert("Error during final submission.")
        } finally {
            setSubmitting(false)
        }
    }

    const progress = ((index) / maxQuestions) * 100

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Assessment</h2>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: 'var(--primary-color)',
                        padding: '0.4rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--primary-color)'
                    }}>
                        {field}
                    </span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                    Question {index + 1} / {maxQuestions}
                </div>
            </div>

            <div className="progress-container" style={{ marginBottom: '2.5rem' }}>
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            {currentQuestion.question?.includes("CONNECTION DIAGNOSTIC") && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error)',
                    color: 'var(--error)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    <strong>⚠️ Network Restriction Detected:</strong> Your firewall is blocking the AI agents. You are seeing local diagnostic questions.
                </div>
            )}

            <div className={`glass-card fade-in border-difficulty-${currentQuestion.difficulty}`} style={{ marginBottom: '1.5rem', borderLeft: '6px solid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <span className={`badge badge-${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Scrambled AI Assessment</span>
                </div>

                <p style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '2rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {currentQuestion.question}
                </p>

                {currentQuestion.type === 'mcq' ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {currentQuestion.options && currentQuestion.options.length > 0 ? (
                            currentQuestion.options.map((opt, i) => (
                                <label
                                    key={`${opt}-${i}`}
                                    className={`option-label ${currentAnswer === opt ? 'selected' : ''}`}
                                >
                                    <div className="option-radio-ui">
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <input
                                        type="radio"
                                        name="quiz-option"
                                        value={opt}
                                        checked={currentAnswer === opt}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        style={{ display: 'none' }}
                                    />
                                    <span style={{ fontSize: '1.1rem' }}>{opt}</span>
                                </label>
                            ))
                        ) : (
                            <div style={{ color: 'var(--error)' }}>Error: Options missing from AI data.</div>
                        )}
                    </div>
                ) : currentQuestion.type === 'code_snippet' ? (
                    <div style={{ position: 'relative' }}>
                        <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '0.5rem 0.5rem 0 0', color: '#6366f1', fontSize: '0.8rem', fontFamily: 'monospace', borderBottom: '1px solid #334155' }}>
                            EDITOR / Snippet Completion
                        </div>
                        <textarea
                            placeholder="// Implement your solution here..."
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="code-textarea"
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                color: '#a5b4fc',
                                fontFamily: "'Fira Code', 'Courier New', monospace",
                                minHeight: '180px',
                                fontSize: '1rem',
                                padding: '1.5rem',
                                border: '1px solid #334155',
                                borderRadius: '0 0 0.5rem 0.5rem',
                                outline: 'none',
                                resize: 'vertical',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>
                ) : currentQuestion.options && currentQuestion.options.length > 0 ? (
                    // Some non-mcq technical questions may still include explicit options (e.g., output_prediction)
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {currentQuestion.options.map((opt, i) => (
                            <label
                                key={`${opt}-${i}`}
                                className={`option-label ${currentAnswer === opt ? 'selected' : ''}`}
                            >
                                <div className="option-radio-ui">
                                    {String.fromCharCode(65 + i)}
                                </div>
                                <input
                                    type="radio"
                                    name="quiz-option"
                                    value={opt}
                                    checked={currentAnswer === opt}
                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                    style={{ display: 'none' }}
                                />
                                <span style={{ fontSize: '1.1rem' }}>{opt}</span>
                            </label>
                        ))}
                    </div>
                ) : currentQuestion.type === 'sql' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Write the SQL query:</label>
                        <textarea
                            placeholder="SELECT ... FROM ... WHERE ...;"
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="text-input"
                            style={{
                                width: '100%',
                                padding: '1.2rem',
                                fontSize: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '0.75rem',
                                color: 'white',
                                outline: 'none',
                                minHeight: '140px'
                            }}
                        />
                    </div>
                ) : currentQuestion.type === 'output_prediction' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Predict the output / expected result:</label>
                        <textarea
                            placeholder="Describe the expected output or explain the reasoning..."
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="text-input"
                            style={{
                                width: '100%',
                                padding: '1.2rem',
                                fontSize: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '0.75rem',
                                color: 'white',
                                outline: 'none',
                                minHeight: '120px'
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Your answer / Explanation:</label>
                        <textarea
                            placeholder="Provide your answer or reasoning here..."
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="text-input"
                            style={{
                                width: '100%',
                                padding: '1.2rem',
                                fontSize: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '0.75rem',
                                color: 'white',
                                outline: 'none',
                                minHeight: '120px'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={skipQuestion}
                        disabled={submitting}
                        style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                        Skip Question
                    </button>
                    <button
                        className="btn"
                        onClick={() => nextQuestion()}
                        disabled={submitting || !currentAnswer}
                        style={{ padding: '0.8rem 3rem', fontSize: '1.1rem' }}
                    >
                        {submitting ? 'Processing...' : (index + 1 === maxQuestions ? 'Finish Assessment' : 'Next Question →')}
                    </button>
                </div>
            </div>
        </div>
    )
}
