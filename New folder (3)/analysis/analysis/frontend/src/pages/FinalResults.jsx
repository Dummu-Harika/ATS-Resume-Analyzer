import { useLocation, useNavigate } from 'react-router-dom';
import './FinalResults.css';

const FinalResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        avgAudio = 0,
        avgVideo = 0,
        avgContent = 0,
        avgRedFlags = 0,
        overallScore = 0,
        recommendation = 'MODERATE FIT',
        evaluations = [],
        answers = []
    } = location.state || {};

    const firstEvaluation = evaluations[0] || {};
    const getScore = (group, key, fallback = 0) => {
        const score = group?.[key]?.score;
        return typeof score === 'number' ? score : fallback;
    };
    const getMetric = (group, key, fallback = 0) => {
        const metric = group?.[key];
        return typeof metric === 'number' ? metric : fallback;
    };

    const getRecommendationColor = (rec) => {
        switch (rec) {
            case 'STRONG FIT': return '#10b981';
            case 'MODERATE FIT': return '#f59e0b';
            case 'POOR FIT': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getRecommendationIcon = (rec) => {
        switch (rec) {
            case 'STRONG FIT': return '✅';
            case 'MODERATE FIT': return '⏸️';
            case 'POOR FIT': return '❌';
            default: return '📋';
        }
    };

    return (
        <div className="results-container">
            <header className="results-header">
                <h1>📊 Final Video HR Assessment</h1>
                <p>Multi-Modal Behavioral & Skill Analysis Report</p>
            </header>

            <div className="overall-score-card tall">
                <div className="score-circle-large">
                    <svg viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                        <circle
                            cx="100"
                            cy="100"
                            r="90"
                            fill="none"
                            stroke={getRecommendationColor(recommendation)}
                            strokeWidth="12"
                            strokeDasharray={`${(overallScore / 100) * 565} 565`}
                            strokeLinecap="round"
                            transform="rotate(-90 100 100)"
                        />
                    </svg>
                    <div className="score-content">
                        <span className="score-number">{overallScore}</span>
                        <span className="score-label">/ 100</span>
                    </div>
                </div>

                <div className="rec-info">
                    <div className="recommendation-badge" style={{ background: getRecommendationColor(recommendation) }}>
                        <span className="recommendation-icon">{getRecommendationIcon(recommendation)}</span>
                        <span className="recommendation-text">{recommendation}</span>
                    </div>
                    <p className="rec-summary">
                        {recommendation === 'STRONG FIT'
                            ? "Excellent behavioral match. Candidate demonstrated high professional maturity, strong communication, and positive visual engagement."
                            : recommendation === 'MODERATE FIT'
                                ? "Good potential with some areas for growth in behavioral consistency or visual presence."
                                : "Significant concerns identified in behavioral responses or professional presentation."}
                    </p>
                </div>
            </div>

            <div className="multi-modal-metrics">
                <h2>📈 Multi-Modal Performance Averages</h2>
                <div className="metrics-grid">
                    <div className="metric-box audio">
                        <div className="box-header">
                            <span className="icon">🎙️</span>
                            <h3>Audio Analysis</h3>
                            <span className="weight">30% Weight</span>
                        </div>
                        <div className="score-bar">
                            <div className="fill" style={{ width: `${avgAudio * 10}%` }}></div>
                        </div>
                        <span className="score-text">{(avgAudio * 10).toFixed(1)}/100</span>
                        <ul className="sub-metrics">
                            <li>Avg Rate: {evaluations[0]?.audio?.metrics?.words_per_minute?.toFixed(0) || '--'} WPM</li>
                            <li>Pitch: {evaluations[0]?.audio?.metrics?.avg_pitch_hz?.toFixed(0) || '--'} Hz</li>
                            <li>Fillers: {evaluations[0]?.audio?.fillers?.total_filler_count || 0} words</li>
                        </ul>
                    </div>

                    <div className="metric-box video">
                        <div className="box-header">
                            <span className="icon">📹</span>
                            <h3>Video Analysis</h3>
                            <span className="weight">25% Weight</span>
                        </div>
                        <div className="score-bar">
                            <div className="fill" style={{ width: `${avgVideo * 10}%` }}></div>
                        </div>
                        <span className="score-text">{(avgVideo * 10).toFixed(1)}/100</span>
                        <ul className="sub-metrics">
                            <li>Eye Gaze: {evaluations[0]?.video?.metrics?.eye_contact_pct?.toFixed(0) || '--'}%</li>
                            <li>Top Emotion: <span style={{ textTransform: 'capitalize' }}>{evaluations[0]?.video?.metrics?.top_emotion || 'Neutral'}</span></li>
                            <li>Posture Score: {evaluations[0]?.video?.body_language?.score?.toFixed(1) || '--'}/10</li>
                        </ul>
                    </div>

                    <div className="metric-box content">
                        <div className="box-header">
                            <span className="icon">📝</span>
                            <h3>Content Analysis</h3>
                            <span className="weight">35% Weight</span>
                        </div>
                        <div className="score-bar">
                            <div className="fill" style={{ width: `${avgContent * 10}%` }}></div>
                        </div>
                        <span className="score-text">{(avgContent * 10).toFixed(1)}/100</span>
                        <ul className="sub-metrics">
                            <li>Semantic Score: {(avgContent * 10).toFixed(0)}%</li>
                            <li>STAR Context: Good</li>
                            <li>Role Match: High</li>
                        </ul>
                    </div>

                    <div className="metric-box red-flags">
                        <div className="box-header">
                            <span className="icon">⚠️</span>
                            <h3>Red Flag Check</h3>
                            <span className="weight">10% Penalty</span>
                        </div>
                        <div className="score-bar penalty">
                            <div className="fill" style={{ width: `${avgRedFlags * 10}%` }}></div>
                        </div>
                        <span className="score-text">Multiplier: {(avgRedFlags).toFixed(1)}</span>
                        <p className="flag-status">{avgRedFlags < 3 ? "✅ Clear" : "⚠️ Minor flags"}</p>
                    </div>
                </div>
            </div>


            <div className="detailed-parameters">
                <h2>📊 17-Parameter Breakdown</h2>
                <div className="param-sections">
                    <div className="param-section">
                        <h3>🎧 Audio & Voice Confidence</h3>
                        <div className="p-grid">
                            <div className="p-item"><span>Confidence</span> <strong>{getScore(firstEvaluation.audio, 'vocal_confidence', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Fluency</span> <strong>{getScore(firstEvaluation.audio, 'speech_fluency', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Tone</span> <strong>{getScore(firstEvaluation.audio, 'emotional_tone', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Clarity</span> <strong>{getScore(firstEvaluation.audio, 'voice_clarity', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Consistency</span> <strong>{getScore(firstEvaluation.audio, 'tone_consistency', 0).toFixed(1)}/10</strong></div>
                        </div>
                    </div>
                    <div className="param-section">
                        <h3>👁️ Visual & Body Language</h3>
                        <div className="p-grid">
                            <div className="p-item"><span>Eye Contact</span> <strong>{getScore(firstEvaluation.video, 'eye_contact', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Posture</span> <strong>{getScore(firstEvaluation.video, 'body_language', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Expressions</span> <strong>{getScore(firstEvaluation.video, 'facial_expressions', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Appearance</span> <strong>{getScore(firstEvaluation.video, 'professional_appearance', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Engagement</span> <strong>{getScore(firstEvaluation.video, 'engagement_level', 0).toFixed(1)}/10</strong></div>
                        </div>
                    </div>
                    <div className="param-section">
                        <h3>💡 Answer Content Quality</h3>
                        <div className="p-grid">
                            <div className="p-item"><span>Communication</span> <strong>{getScore(firstEvaluation.content, 'communication_skills', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Cultural Fit</span> <strong>{getScore(firstEvaluation.content, 'cultural_fit', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Motivation</span> <strong>{getScore(firstEvaluation.content, 'motivation', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Problem Solving</span> <strong>{getScore(firstEvaluation.content, 'problem_solving', 0).toFixed(1)}/10</strong></div>
                            <div className="p-item"><span>Maturity</span> <strong>{getScore(firstEvaluation.content, 'professional_maturity', 0).toFixed(1)}/10</strong></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="formula-card compact">
                <h4>📐 Multi-Modal Scoring Logic</h4>
                <code>Score = (Audio × 3.0) + (Video × 2.5) + (Content × 3.5) - (Red Flags × 1.0)</code>
            </div>

            <div className="action-buttons">
                <button className="btn-home" onClick={() => navigate('/')}>🔄 Restart Analysis</button>
                <button className="btn-download" onClick={() => window.print()}>📥 Download HR Report</button>
            </div>
        </div>
    );
};

export default FinalResults;
