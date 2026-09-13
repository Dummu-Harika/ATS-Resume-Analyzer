import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeResume, submitApplication, fetchJobRoles, startRound2 } from '../api';
import { Card, Button } from '../components/Shared';
import { AIInsightSection } from '../components/AnalysisComponents';
import {
    Sparkles,
    UploadCloud,
    FileText,
    CheckCircle2,
    ArrowRight,
    Briefcase,
    User,
    TrendingUp,
    AlertCircle,
    Terminal,
    Mic,
    Layers,
    ChevronDown,
    Zap,
    Target
} from 'lucide-react';

const ScoreItem = ({ label, value, feedback }) => (
    <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>{label}</span>
            <span style={{ color: value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444' }}>{value}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--metric-border)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
                width: `${value}%`,
                height: '100%',
                background: value >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' : value >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                borderRadius: '999px',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }} />
        </div>
        {feedback && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                {feedback}
            </p>
        )}
    </div>
);

const JOB_ROLES = {
    Cybersecurity: {},
    FullStackDeveloper: {},
    DataScienceEngineer: {},
    AIMLEngineer: {},
    JavaFullStackDeveloper: {}
};

export default function JobSeeker() {
    const [roles, setRoles] = useState(JOB_ROLES);
    const [selectedRole, setSelectedRole] = useState('');
    const [fullName, setFullName] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState(null);
    const uploadSectionRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobRoles().then(setRoles).catch(console.error);
    }, []);

    // Simulated scanning progress steps
    useEffect(() => {
        let interval = null;
        if (loading) {
            setLoadingStep(1);
            interval = setInterval(() => {
                setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 1200);
        } else {
            setLoadingStep(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loading]);

    const scrollToUpload = () => {
        if (uploadSectionRef.current) {
            uploadSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedRole || !fullName.trim()) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('role', selectedRole);
        formData.append('file', file);

        try {
            const data = await analyzeResume(formData);
            setResult(data);

            const appData = {
                name: fullName.trim(),
                role: selectedRole,
                score: data.analysis.overallScore,
                analysis: data.analysis,
                status: data.suggested_status || (data.analysis.overallScore >= 60 ? 'Submitted' : 'Rejected'),
                resume_url: data.resume_url
            };

            const savedApp = await submitApplication(appData);
            setStatus(savedApp);
            if (savedApp?.id) {
                sessionStorage.setItem('current_candidate_id', savedApp.id);
            }
        } catch (error) {
            alert('Analysis failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const proceedToRound2 = async () => {
        if (!status || !status.id) {
            alert('Application ID not found. Please try again.');
            return;
        }

        try {
            const res = await startRound2(status.id);
            const { session_id, question } = res;
            try {
                sessionStorage.setItem('current_candidate_id', status.id);
                sessionStorage.setItem('round2_candidate_id', status.id);
                sessionStorage.setItem(`round2_initial_${session_id}`, JSON.stringify(question));
            } catch (e) { /* ignore */ }
            navigate(`/round2?session_id=${encodeURIComponent(session_id)}`);
        } catch (err) {
            alert('Failed to start Round 2: ' + (err.message || err));
        }
    };

    // --- RESULTS VIEW (AFTER ROUND 1 SCREENING) ---
    if (result && status) {
        const isQualified = status.score >= 60;

        return (
            <div className="fade-in" style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
                {/* Result Header Banner */}
                <div style={{
                    padding: '1.75rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: isQualified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1.5px solid ${isQualified ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span className={`badge-pill ${isQualified ? 'badge-passed' : 'badge-failed'}`}>
                                {isQualified ? 'ROUND 1 CLEARED' : 'NOT QUALIFIED'}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Application ID: #{status.id}</span>
                        </div>
                        <h2 style={{ margin: '0 0 6px', fontSize: '1.65rem' }}>
                            {isQualified ? `🎉 Congratulations, ${status.name}!` : `Evaluation Complete, ${status.name}`}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            {isQualified
                                ? 'Your resume demonstrated high competency alignment with the benchmark criteria. You have successfully cleared Round 1 (ATS Screening) and are qualified to take the Round 2 Technical Assessment.'
                                : 'Your background partially aligns with this role, but did not reach the threshold (60%) required to proceed to the Technical Round. Review the skill recommendations below to strengthen your profile.'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="score-circle" style={{ '--percentage': `${status.score}%`, color: isQualified ? '#10b981' : '#ef4444', width: '90px', height: '90px', fontSize: '1.75rem', margin: '0 0 8px' }}>
                            <span className="score-value">{status.score}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATS Score</span>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="dashboard-grid">
                    <Card className="card-glow-accent">
                        <h3 style={{ color: 'var(--brand-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={20} />
                            <span>Competency Dimensions</span>
                        </h3>
                        <ScoreItem label="Technical Skills Match" value={result.analysis.breakdown.skills} feedback={result.analysis.feedback?.skills} />
                        <ScoreItem label="Experience Alignment" value={result.analysis.breakdown.experience} feedback={result.analysis.feedback?.experience} />
                        <ScoreItem label="Education & Credentials" value={result.analysis.breakdown.education} feedback={result.analysis.feedback?.education} />
                        <ScoreItem label="Project Rigor" value={result.analysis.breakdown.projects} feedback={result.analysis.feedback?.projects} />
                        <ScoreItem label="ATS Parsability & Format" value={result.analysis.breakdown.format} feedback={result.analysis.feedback?.ats} />
                    </Card>

                    <Card className="card-glow-accent">
                        <h3 style={{ color: '#10b981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={20} />
                            <span>Matched Competencies</span>
                        </h3>
                        <div className="tags" style={{ marginBottom: '1.5rem' }}>
                            {result.analysis.matched_skills?.map(skill => (
                                <span key={skill} className="tag match">{skill}</span>
                            ))}
                            {(!result.analysis.matched_skills || result.analysis.matched_skills.length === 0) && (
                                <small style={{ color: 'var(--text-muted)' }}>No direct keywords matched.</small>
                            )}
                        </div>

                        <h3 style={{ color: '#f59e0b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} />
                            <span>Recommended Skills to Acquire</span>
                        </h3>
                        <div className="tags">
                            {result.analysis.missing_skills?.map(skill => (
                                <span key={skill} className="tag missing">{skill}</span>
                            ))}
                        </div>
                    </Card>

                    <AIInsightSection analysis={result.analysis.ai_analysis} />
                </div>

                {/* Seamless continuation to Round 2 */}
                {isQualified && (
                    <div style={{ marginTop: '2.5rem', textAlign: 'center', background: 'var(--bg-card)', padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid var(--metric-border)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <Terminal size={28} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>Ready to Take Round 2: Technical Assessment?</h3>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 1.75rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            You will answer 15 targeted technical questions (multiple choice, SQL, code debugging, and architecture). Achieve &gt;= 70% to qualify for Round 3.
                        </p>
                        <Button
                            variant="primary"
                            onClick={proceedToRound2}
                            style={{ padding: '0.95rem 2.5rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                        >
                            <span>🚀 Launch Round 2 Technical Assessment</span>
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // --- PROFESSIONAL JOB SEEKER LANDING PAGE ---
    return (
        <div className="fade-in">
            {/* HERO SECTION */}
            <section style={{ textAlign: 'center', padding: '3.5rem 1rem 4rem', maxWidth: '880px', margin: '0 auto' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 16px', borderRadius: '30px', marginBottom: '1.25rem' }}>
                    <Sparkles size={15} color="var(--brand-primary)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Autonomous 3-Stage Hiring Pipeline
                    </span>
                </div>

                <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.4rem)', lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
                    Next-Generation Engineering Talent Screening
                </h1>

                <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                    Fast-track your application through our automated, merit-driven evaluation pipeline: Deep ATS resume parsing, adaptive technical testing, and AI video interviews.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="primary"
                        onClick={scrollToUpload}
                        style={{ padding: '0.95rem 2.2rem', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>Apply & Upload Resume</span>
                        <ChevronDown size={18} />
                    </Button>
                </div>
            </section>

            {/* 3-STAGE FUNNEL EXPLANATION */}
            <section style={{ marginBottom: '4rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.85rem', marginBottom: '8px' }}>How the Assessment Funnel Works</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Three rigorous, objective stages designed to showcase your technical excellence.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {/* Stage 1 Card */}
                    <Card className="card-glow-accent">
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <FileText size={24} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            Stage 1 • Pass Mark 60%
                        </div>
                        <h3 style={{ fontSize: '1.25rem', margin: '0 0 8px' }}>ATS Resume Analysis</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                            AI deeply examines your resume against target engineering role benchmarks, scoring technical skills, past experience, and project impact.
                        </p>
                    </Card>

                    {/* Stage 2 Card */}
                    <Card className="card-glow-accent">
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <Terminal size={24} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            Stage 2 • Pass Mark 70%
                        </div>
                        <h3 style={{ fontSize: '1.25rem', margin: '0 0 8px' }}>Technical Assessment</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                            15 timed technical questions covering code snippets, SQL queries, debugging scenarios, and architecture fundamentals.
                        </p>
                    </Card>

                    {/* Stage 3 Card */}
                    <Card className="card-glow-accent">
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <Mic size={24} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            Stage 3 • Pass Mark 80%
                        </div>
                        <h3 style={{ fontSize: '1.25rem', margin: '0 0 8px' }}>AI Voice & Video Interview</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                            Autonomous video interview with live speech transcription, measuring STAR framework depth, communication clarity, and technical leadership.
                        </p>
                    </Card>
                </div>
            </section>

            {/* APPLICATION UPLOAD SECTION */}
            <section ref={uploadSectionRef} id="upload-section" style={{ maxWidth: '680px', margin: '0 auto 4rem', paddingTop: '2rem' }}>
                <Card className="card-glow-accent" style={{ padding: '2.5rem 2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                        <h2 style={{ fontSize: '1.65rem', marginBottom: '6px' }}>Submit Your Application</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                            Fill in your details and attach your resume to begin Round 1 screening.
                        </p>
                    </div>

                    <form onSubmit={handleUpload}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={15} color="var(--brand-primary)" />
                                <span>Full Legal Name</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="e.g. Alexandra Vance"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Briefcase size={15} color="var(--brand-primary)" />
                                <span>Target Engineering Position</span>
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select target position...</option>
                                {Object.keys(roles).map(role => (
                                    <option key={role} value={role}>{role.replace(/([A-Z])/g, ' $1').trim()}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={15} color="var(--brand-primary)" />
                                <span>Upload Resume Document (PDF / DOCX / TXT)</span>
                            </label>
                            <div style={{
                                border: file ? '2px solid #10b981' : '2px dashed var(--brand-primary)',
                                borderRadius: '14px',
                                padding: '1.75rem 1rem',
                                textAlign: 'center',
                                background: file ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-elevated)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                position: 'relative'
                            }}>
                                <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={(e) => setFile(e.target.files[0])}
                                required
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                            />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <UploadCloud size={36} color={file ? '#10b981' : 'var(--brand-primary)'} />
                                    <div style={{ fontWeight: 600, color: file ? '#10b981' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                                        {file ? file.name : 'Choose resume file or drag & drop here'}
                                    </div>
                                    <small style={{ color: 'var(--text-muted)' }}>
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF, DOCX or TXT format (max 10MB)'}
                                    </small>
                                </div>
                            </div>
                        </div>

                        {loading && (
                            <div style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <Sparkles size={18} className="spin" color="var(--brand-primary)" />
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {loadingStep === 1 && 'Step 1: Extracting Resume Text & Tokens...'}
                                        {loadingStep === 2 && 'Step 2: Cross-referencing Role Benchmarks...'}
                                        {loadingStep >= 3 && 'Step 3: Calculating ATS Eligibility Score...'}
                                    </span>
                                </div>
                                <div style={{ height: '4px', background: 'var(--metric-border)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${loadingStep * 33}%`,
                                        height: '100%',
                                        background: 'var(--brand-gradient)',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading || !file || !selectedRole || !fullName.trim()}
                            style={{ width: '100%', padding: '0.95rem', fontSize: '1.05rem' }}
                        >
                            {loading ? 'Evaluating Resume...' : 'Analyze Resume & Enter Evaluation Funnel →'}
                        </Button>
                    </form>
                </Card>
            </section>
        </div>
    );
}
