import React, { useState, useEffect } from 'react';
import { analyzeResume, submitApplication, fetchJobRoles } from '../screeningApi';
import { Card } from './Shared';
import { AIInsightSection, FinalReportSection } from './AnalysisComponents';

const ProgressBar = ({ label, value }) => (
    <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{label}</span>
            <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.85rem' }}>{value}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
            <div style={{
                width: `${value}%`,
                height: '100%',
                background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                borderRadius: '4px',
                transition: 'width 0.8s ease-out'
            }}></div>
        </div>
    </div>
);

const ScoreItem = ({ label, value, feedback }) => (
    <div style={{ marginBottom: '1rem' }}>
        <ProgressBar label={label} value={value} />
        {feedback && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-0.25rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                <em>Analysis: {feedback}</em>
            </p>
        )}
    </div>
);

export default function Screening({ onProceed }) {
    const [roles, setRoles] = useState({});
    const [selectedRole, setSelectedRole] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState(null);
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        fetchJobRoles().then(setRoles).catch(err => {
            console.error(err);
            // Fallback roles if backend is down
            setRoles({
                Cybersecurity: {},
                "AI/ML Engineer": {},
                "Full Stack Developer (FSD)": {},
                "Data Science": {},
                "Java Developer": {}
            });
        });
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedRole) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('role', selectedRole);
        formData.append('file', file);

        try {
            const data = await analyzeResume(formData);
            setResult(data);

            const appData = {
                name: fullName,
                role: selectedRole,
                score: data.analysis.overallScore,
                analysis: data.analysis,
                status: data.suggested_status,
                resume_url: data.resume_url
            };

            const savedApp = await submitApplication(appData);
            setStatus(savedApp);
        } catch (error) {
            alert('Analysis failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (result && status) {
        return (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <Card style={{ textAlign: 'center' }}>
                    {status.score > 60 ? (
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--success)', marginBottom: '2rem', textAlign: 'left' }}>
                            <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>🎉 Congratulations!</h2>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>Your resume matches our requirements. You are shortlisted for the technical interview round.</p>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--error)', marginBottom: '2rem', textAlign: 'left' }}>
                            <h2 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Application Status</h2>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>Your profile doesn't quite match our current needs for this specific role. Score: {status.score}%</p>
                        </div>
                    )}

                    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={status.score > 60 ? 'var(--success)' : 'var(--error)'} strokeWidth="2" strokeDasharray={`${status.score}, 100`} />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {status.score}
                        </div>
                    </div>

                    {status.score > 60 && (
                        <button className="btn" onClick={() => onProceed(selectedRole, status.id, fullName)} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                            🚀 Proceed to Technical Quiz
                        </button>
                    )}

                    <button className="btn btn-secondary" onClick={() => { setResult(null); setStatus(null); }} style={{ marginTop: '1rem', width: '100%', fontSize: '0.9rem' }}>
                        Try Another Resume
                    </button>
                    <p style={{ marginTop: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>Application ID: {status.id}</p>
                </Card>

                <Card>
                    <h3 style={{ marginBottom: '1.5rem' }}>Detailed Breakdown</h3>
                    <ScoreItem label="Skills Analysis" value={result.analysis.breakdown.skills} feedback={result.analysis.feedback?.skills} />
                    <ScoreItem label="Experience" value={result.analysis.breakdown.experience} feedback={result.analysis.feedback?.experience} />
                    <ScoreItem label="Education" value={result.analysis.breakdown.education} feedback={result.analysis.feedback?.education} />
                    <ScoreItem label="Projects" value={result.analysis.breakdown.projects} feedback={result.analysis.feedback?.projects} />
                </Card>

                <AIInsightSection analysis={result.analysis.ai_analysis} />

                <div style={{ gridColumn: 'span 2' }}>
                    <FinalReportSection report={result.analysis.final_report} />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Step 1: Resume Screening</h2>
            <form onSubmit={handleUpload}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your name"
                        required
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Target Role</label>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        required
                    >
                        <option value="" disabled>Select role...</option>
                        {Object.keys(roles).map(role => (
                            <option key={role} value={role}>{role.replace(/([A-Z])/g, ' $1').trim()}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Upload Resume (PDF)</label>
                    <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                    />
                </div>

                <button type="submit" className="btn" style={{ width: '100%', padding: '1rem' }} disabled={loading}>
                    {loading ? 'Analyzing your profile...' : 'Apply & Screen Resume'}
                </button>
            </form>
        </div>
    );
}
