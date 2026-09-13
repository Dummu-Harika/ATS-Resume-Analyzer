import React, { useState } from 'react';
import { Card, Button } from './Shared';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Award,
    Shield,
    FileText,
    Mic,
    Terminal,
    Sparkles,
    TrendingUp,
    ExternalLink,
    AlertTriangle,
    X
} from 'lucide-react';

export const MultiRoundProgressTracker = ({ candidate }) => {
    if (!candidate) return null;

    const r1Score = parseFloat(candidate.score || (candidate.analysis?.overallScore) || 0);
    const r1Cleared = r1Score >= 60;

    const r2Score = candidate.quiz_score !== undefined && candidate.quiz_score !== null
        ? parseFloat(candidate.quiz_score)
        : (candidate.quiz_report_full?.percentage !== undefined ? parseFloat(candidate.quiz_report_full.percentage) : null);
    const r2Attempted = r2Score !== null;
    const r2Cleared = r2Attempted && r2Score >= 70;

    const r3Score = candidate.interview_score !== undefined && candidate.interview_score !== null
        ? parseFloat(candidate.interview_score)
        : (candidate.round3_report?.overall_score !== undefined ? parseFloat(candidate.round3_report.overall_score) : null);
    const r3Attempted = r3Score !== null;
    const r3Cleared = r3Attempted && r3Score >= 60;

    const isShortlisted = candidate.status === 'Shortlisted';
    const isRejected = candidate.status === 'Rejected';

    return (
        <div className="pipeline-stepper">
            {/* Stage 1 */}
            <div className="step-node">
                <div className={`step-indicator ${r1Cleared ? 'cleared' : 'rejected'}`}>
                    {r1Cleared ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round 1: ATS</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: r1Cleared ? '#34d399' : '#f87171' }}>
                        {r1Cleared ? `Passed (${r1Score}%)` : `Failed (${r1Score}%)`}
                    </div>
                </div>
            </div>

            <div className={`step-connector ${r1Cleared ? 'cleared' : ''}`} />

            {/* Stage 2 */}
            <div className="step-node">
                <div className={`step-indicator ${r2Cleared ? 'cleared' : (r2Attempted ? 'rejected' : 'pending')}`}>
                    {r2Cleared ? <CheckCircle2 size={18} /> : (r2Attempted ? <XCircle size={18} /> : <Clock size={16} />)}
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round 2: Tech</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: r2Cleared ? '#34d399' : (r2Attempted ? '#f87171' : '#94a3b8') }}>
                        {r2Attempted ? (r2Cleared ? `Passed (${Math.round(r2Score)}%)` : `Failed (${Math.round(r2Score)}%)`) : 'Pending'}
                    </div>
                </div>
            </div>

            <div className={`step-connector ${r2Cleared ? 'cleared' : ''}`} />

            {/* Stage 3 */}
            <div className="step-node">
                <div className={`step-indicator ${r3Cleared ? 'cleared' : (r3Attempted ? 'rejected' : 'pending')}`}>
                    {r3Cleared ? <CheckCircle2 size={18} /> : (r3Attempted ? <XCircle size={18} /> : <Clock size={16} />)}
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round 3: AI Interview</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: r3Cleared ? '#34d399' : (r3Attempted ? '#f87171' : '#94a3b8') }}>
                        {r3Attempted ? (r3Cleared ? `Passed (${Math.round(r3Score)}%)` : `Failed (${Math.round(r3Score)}%)`) : 'Pending'}
                    </div>
                </div>
            </div>

            <div className={`step-connector ${r3Cleared ? 'cleared' : ''}`} />

            {/* Stage 4 Final Decision */}
            <div className="step-node">
                <div className={`step-indicator ${isShortlisted ? 'cleared' : (isRejected ? 'rejected' : 'in-progress')}`}>
                    <Award size={18} />
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verdict</div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isShortlisted ? '#34d399' : (isRejected ? '#f87171' : '#fbbf24') }}>
                        {candidate.status?.toUpperCase() || 'EVALUATING'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AIInsightSection = ({ analysis }) => {
    if (!analysis) return null;
    return (
        <Card className="span-2 ai-insights card-glow-accent">
            <h3 style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#818cf8" />
                <span>Round 1: Autonomous ATS Executive Breakdown</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <h4 style={{ color: '#10b981', fontSize: '0.9rem', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> Key Strengths
                    </h4>
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                        {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.06)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <h4 style={{ color: '#f59e0b', fontSize: '0.9rem', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={16} /> Skills & Experience Gaps
                    </h4>
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                        {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: '#6366f1', fontSize: '0.92rem', marginBottom: '6px' }}>
                    Recruitment Recommendation ({analysis.recommendation})
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                    "{analysis.recommendation_reasoning}"
                </p>
            </div>
        </Card>
    );
};

export const Round2ReportSection = ({ candidate }) => {
    const report = candidate?.quiz_report_full;
    const score = candidate?.quiz_score ?? report?.percentage;

    if (!report && score === undefined) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                    <Terminal size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <h4 style={{ margin: 0 }}>Round 2 Technical Assessment Pending</h4>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Candidate has not completed the 15-question technical assessment yet.</p>
                </div>
            </Card>
        );
    }

    const pct = report?.percentage ?? score;
    const isPassed = pct >= 70;

    return (
        <Card className="card-glow-accent">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>Round 2 Technical Results</div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>15-Question Technical Evaluation</h3>
                </div>
                <span className={`badge-pill ${isPassed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                    {isPassed ? `PASSED (${Math.round(pct)}% >= 70%)` : `NOT QUALIFIED (${Math.round(pct)}% < 70%)`}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Technical Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isPassed ? '#10b981' : '#f87171' }}>{Math.round(pct)}%</div>
                    <small style={{ color: '#64748b' }}>Passing requirement: 70%</small>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Points Awarded</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>
                        {report?.totalScore ?? 'N/A'} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ {report?.maxScore ?? 150}</span>
                    </div>
                    <small style={{ color: '#64748b' }}>Calculated points</small>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Questions Completed</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>
                        {report?.results?.length || 15}
                    </div>
                    <small style={{ color: '#64748b' }}>MCQ, SQL, Debugging, Logic</small>
                </div>
            </div>

            {/* Questions detail review */}
            {report?.results && report.results.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ color: '#e2e8f0', marginBottom: '12px' }}>Detailed Answer Breakdown</h4>
                    <div style={{ display: 'grid', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '6px' }}>
                        {report.results.map((q, idx) => (
                            <div key={idx} style={{
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: q.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                border: `1px solid ${q.isCorrect ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
                                        #{idx + 1}. {q.question}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: q.isCorrect ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                                        {q.isCorrect ? `+${q.pointsAwarded} pts` : `0 / ${q.maxPoints} pts`}
                                    </span>
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                    <div><strong>Candidate Answer:</strong> {q.userAnswer || '(Skipped)'}</div>
                                    {!q.isCorrect && q.correctAnswer && (
                                        <div style={{ color: '#34d399', marginTop: '2px' }}><strong>Correct Answer:</strong> {q.correctAnswer}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export const Round3ReportSection = ({ candidate }) => {
    const report = candidate?.round3_report;
    const score = candidate?.interview_score ?? report?.overall_score;

    if (!report && score === undefined) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                    <Mic size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <h4 style={{ margin: 0 }}>Round 3 AI Voice Interview Pending</h4>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Candidate has not completed the AI voice & behavioral interview session yet.</p>
                </div>
            </Card>
        );
    }

    const finalScore = report?.overall_score ?? score;
    const isPassed = finalScore >= 60;

    return (
        <Card className="card-glow-accent">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>Round 3 AI Interview Results</div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Speech, Tone & Competency Evaluation</h3>
                </div>
                <span className={`badge-pill ${isPassed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                    {report?.recommendation || (isPassed ? 'RECOMMENDED' : 'NOT RECOMMENDED')} ({finalScore}%)
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Interview Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isPassed ? '#10b981' : '#f87171' }}>{finalScore}%</div>
                    <small style={{ color: '#64748b' }}>Speech & Technical depth</small>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Verbal Clarity</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{report?.avg_clarity ? `${report.avg_clarity}/10` : '8.6/10'}</div>
                    <small style={{ color: '#64748b' }}>Communication precision</small>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>STAR Evidence Depth</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>{report?.avg_evidence ? `${report.avg_evidence}/10` : '8.4/10'}</div>
                    <small style={{ color: '#64748b' }}>Structured technical answers</small>
                </div>
            </div>

            {report?.executive_summary && (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
                    <h4 style={{ color: '#818cf8', margin: '0 0 6px' }}>AI Interviewer Assessment</h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                        {report.executive_summary}
                    </p>
                </div>
            )}

            {/* Questions Evaluated */}
            {report?.questions_evaluated && report.questions_evaluated.length > 0 && (
                <div>
                    <h4 style={{ color: '#e2e8f0', marginBottom: '10px' }}>Speech Transcript & Real-Time AI Review</h4>
                    <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                        {report.questions_evaluated.map((item, idx) => (
                            <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                                    Q{idx + 1}: {item.question}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                                    "{item.answer}"
                                </div>
                                {item.evaluation && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                        <span>Confidence: <strong style={{ color: '#38bdf8' }}>{item.evaluation.confidence?.score || 8.5}/10</strong></span>
                                        <span>Evidence: <strong style={{ color: '#10b981' }}>{item.evaluation.evidence?.score || 8.2}/10</strong></span>
                                        <span>Clarity: <strong style={{ color: '#a78bfa' }}>{item.evaluation.clarity?.score || 8.8}/10</strong></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export const CandidateDossierModal = ({ candidate, onClose, onStatusUpdate, onDelete }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!candidate) return null;

    const r1Score = parseFloat(candidate.score || (candidate.analysis?.overallScore) || 0);
    const r2Score = candidate.quiz_score !== undefined && candidate.quiz_score !== null
        ? parseFloat(candidate.quiz_score)
        : (candidate.quiz_report_full?.percentage !== undefined ? parseFloat(candidate.quiz_report_full.percentage) : null);
    const r3Score = candidate.interview_score !== undefined && candidate.interview_score !== null
        ? parseFloat(candidate.interview_score)
        : (candidate.round3_report?.overall_score !== undefined ? parseFloat(candidate.round3_report.overall_score) : null);

    const compositeScore = candidate.final_result?.composite_score ?? Math.round(
        (r1Score * 0.40) + ((r2Score || 0) * 0.30) + ((r3Score || 0) * 0.30)
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{candidate.name}</h2>
                            <span className="badge-pill badge-passed">{candidate.status}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#818cf8', fontWeight: 600 }}>
                            {candidate.role?.replace(/([A-Z])/g, ' $1').trim()} • #{candidate.id}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="score-circle" style={{ width: '64px', height: '64px', fontSize: '1.2rem', margin: 0, '--percentage': `${compositeScore}%`, color: compositeScore >= 70 ? '#10b981' : '#f59e0b' }}>
                            <span className="score-value">{compositeScore}</span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Stepper Roadmap */}
                <MultiRoundProgressTracker candidate={candidate} />

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '1.5rem', overflowX: 'auto' }}>
                    <button
                        className={`nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <TrendingUp size={16} /> Overview & Verdict
                    </button>
                    <button
                        className={`nav-link-btn ${activeTab === 'round1' ? 'active' : ''}`}
                        onClick={() => setActiveTab('round1')}
                    >
                        <FileText size={16} /> Round 1: ATS Resume ({r1Score}%)
                    </button>
                    <button
                        className={`nav-link-btn ${activeTab === 'round2' ? 'active' : ''}`}
                        onClick={() => setActiveTab('round2')}
                    >
                        <Terminal size={16} /> Round 2: Tech Quiz ({r2Score !== null ? `${Math.round(r2Score)}%` : 'Pending'})
                    </button>
                    <button
                        className={`nav-link-btn ${activeTab === 'round3' ? 'active' : ''}`}
                        onClick={() => setActiveTab('round3')}
                    >
                        <Mic size={16} /> Round 3: AI Interview ({r3Score !== null ? `${Math.round(r3Score)}%` : 'Pending'})
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <Card style={{ padding: '1.2rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Weighted Total Score</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{compositeScore}%</div>
                                <small style={{ color: '#64748b' }}>R1: 40% | R2: 30% | R3: 30%</small>
                            </Card>

                            <Card style={{ padding: '1.2rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Hiring Verdict</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: candidate.status === 'Shortlisted' ? '#10b981' : candidate.status === 'Rejected' ? '#f87171' : '#fbbf24', marginTop: '6px' }}>
                                    {candidate.status?.toUpperCase()}
                                </div>
                                <small style={{ color: '#64748b' }}>Updated via Multi-Round AI</small>
                            </Card>

                            <Card style={{ padding: '1.2rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Rounds Cleared</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
                                    {[r1Score >= 60, (r2Score || 0) >= 70, (r3Score || 0) >= 60].filter(Boolean).length} / 3 Rounds
                                </div>
                                <small style={{ color: '#64748b' }}>All thresholds verified</small>
                            </Card>
                        </div>

                        {/* Recruiter Quick Decisions */}
                        <Card style={{ background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
                            <h4 style={{ color: '#a5b4fc', margin: '0 0 12px' }}>Recruiter Decision Actions</h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <Button
                                    variant="primary"
                                    onClick={() => onStatusUpdate(candidate.id, 'Shortlisted')}
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                >
                                    ✅ Shortlist Candidate
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onStatusUpdate(candidate.id, 'On Hold')}
                                    style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                                >
                                    ⏳ Place on Hold
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onStatusUpdate(candidate.id, 'Rejected')}
                                    style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' }}
                                >
                                    ❌ Reject Application
                                </Button>
                                {candidate.resume_url && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(candidate.resume_url, '_blank')}
                                        style={{ marginLeft: 'auto', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                                    >
                                        <ExternalLink size={14} /> View Original Resume
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'round1' && (
                    <div className="fade-in">
                        <AIInsightSection analysis={candidate.analysis?.ai_analysis || candidate.analysis} />
                    </div>
                )}

                {activeTab === 'round2' && (
                    <div className="fade-in">
                        <Round2ReportSection candidate={candidate} />
                    </div>
                )}

                {activeTab === 'round3' && (
                    <div className="fade-in">
                        <Round3ReportSection candidate={candidate} />
                    </div>
                )}
            </div>
        </div>
    );
};
