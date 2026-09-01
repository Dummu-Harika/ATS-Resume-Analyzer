import './EvaluationResults.css';

const EvaluationResults = ({ evaluation, showDetails = true, isHRRound = false }) => {
    if (!evaluation) {
        return null;
    }

    const getScoreColor = (score) => {
        if (score >= 8) return '#10b981'; // green
        if (score >= 6) return '#f59e0b'; // amber
        if (score >= 4) return '#f97316'; // orange
        return '#ef4444'; // red
    };

    const getScoreLabel = (score) => {
        if (score >= 8) return 'Excellent';
        if (score >= 6) return 'Good';
        if (score >= 4) return 'Fair';
        return 'Needs Improvement';
    };

    // HR Round Parameters
    const hrParameters = [
        { key: 'communication_skills', label: 'Communication Skills', icon: '💬', description: 'Clarity and professionalism' },
        { key: 'cultural_fit', label: 'Cultural Fit', icon: '🤝', description: 'Teamwork and values' },
        { key: 'motivation', label: 'Motivation', icon: '🎯', description: 'Interest and goals' },
        { key: 'problem_solving', label: 'Problem-Solving', icon: '🧩', description: 'Logic and accountability' },
        { key: 'professional_maturity', label: 'Professional Maturity', icon: '🌱', description: 'Growth mindset' },
        { key: 'red_flags', label: 'Red Flags', icon: '⚠️', description: 'Lower is better' }
    ];

    // Original Technical Round Parameters
    const techParameters = [
        { key: 'confidence', label: 'Confidence', icon: '💪', description: 'Tone certainty and fluency' },
        { key: 'evidence', label: 'Evidence', icon: '📋', description: 'Real examples and facts' },
        { key: 'clarity', label: 'Clarity', icon: '💡', description: 'Structure and understanding' },
        { key: 'arrogance', label: 'Arrogance', icon: '⚠️', description: 'Lower is better' }
    ];

    const parameters = isHRRound ? hrParameters : techParameters;

    return (
        <div className="evaluation-results">
            <h3>Answer Evaluation</h3>

            <div className="parameters-grid">
                {parameters.map(param => {
                    const data = evaluation[param.key];
                    const score = data?.score || 0;
                    const isRedFlag = param.key === 'red_flags' || param.key === 'arrogance';

                    return (
                        <div key={param.key} className="parameter-card">
                            <div className="parameter-header">
                                <span className="parameter-icon">{param.icon}</span>
                                <div>
                                    <h4>{param.label}</h4>
                                    <p className="parameter-desc">{param.description}</p>
                                </div>
                            </div>

                            <div className="score-display">
                                <div
                                    className="score-circle"
                                    style={{
                                        background: `conic-gradient(${getScoreColor(score)} ${score * 36}deg, #e5e7eb 0deg)`
                                    }}
                                >
                                    <div className="score-inner">
                                        <span className="score-value">{score.toFixed(1)}</span>
                                        <span className="score-max">/10</span>
                                    </div>
                                </div>
                                <span
                                    className="score-label"
                                    style={{ color: getScoreColor(score) }}
                                >
                                    {getScoreLabel(score)}
                                </span>
                            </div>

                            {showDetails && data?.explanation && (
                                <div className="justification">
                                    <p>{data.explanation}</p>
                                    {data.quotes && data.quotes.length > 0 && (
                                        <div className="key-phrases">
                                            {data.quotes.map((phrase, idx) => (
                                                <span key={idx} className="phrase-tag">"{phrase}"</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EvaluationResults;
