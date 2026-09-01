import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeResume, submitApplication, fetchJobRoles, startRound2 } from '../api';
import { Card, Button, ProgressBar } from '../components/Shared';
import { AIInsightSection, FinalReportSection } from '../components/AnalysisComponents';
// import { FileText, Upload, CheckCircle } from 'lucide-react'; // Unused

const ScoreItem = ({ label, value, feedback }) => (
    <div className="mb-4">
        <ProgressBar label={label} value={value} />
        {feedback && (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '-0.25rem', marginBottom: '1rem' }}>
                <em>Analysis: {feedback}</em>
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
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobRoles().then(setRoles).catch(console.error);
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

            // Auto-submit application to simulate applying
            const appData = {
                name: document.getElementById('fullName').value,
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

    if (result && status) {
        return (
            <div className="dashboard-grid">
                <Card>
                    <div className="text-center">
                        {status.score > 60 && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                padding: '1.5rem',
                                borderRadius: '15px',
                                marginBottom: '2rem',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                textAlign: 'left'
                            }}>
                                <h2 style={{ color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>🎉 Congratulations!</h2>
                                <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#e2e8f0' }}>
                                    Your resume shows strong alignment with the selected job role. You have been shortlisted for the next round. Our team will review your profile and update you shortly.
                                </p>
                            </div>
                        )}

                        {status.score <= 60 && status.score >= 40 && (
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                color: '#f59e0b',
                                padding: '1.5rem',
                                borderRadius: '15px',
                                marginBottom: '2rem',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                textAlign: 'left'
                            }}>
                                <h2 style={{ color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>⏳ Application Under Review</h2>
                                <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#e2e8f0' }}>
                                    Your profile partially matches the job requirements. Your application is currently on hold for further review. You may be considered based on overall applicant volume or future openings.
                                </p>
                            </div>
                        )}

                        {status.score < 40 && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                padding: '1.5rem',
                                borderRadius: '15px',
                                marginBottom: '2rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                textAlign: 'left'
                            }}>
                                <h2 style={{ color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>❌ Application Not Selected</h2>
                                <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#e2e8f0' }}>
                                    At this time, your profile does not sufficiently match the requirements for this role. We encourage you to strengthen relevant skills and apply again in the future.
                                </p>
                            </div>
                        )}

                        <div className="score-circle" style={{ '--percentage': `${status.score}%`, color: status.score > 60 ? '#10b981' : status.score >= 40 ? '#f59e0b' : '#ef4444' }}>
                            <span className="score-value">{status.score}</span>
                        </div>
                        <h2 className="mt-4">Analysis Complete</h2>
                        <div className={`status-badge status-${status.status.toLowerCase().replace(' ', '-')}`} style={{
                            display: 'inline-block',
                            fontSize: '1rem',
                            padding: '0.5rem 1rem',
                            background: status.score > 60 ? 'rgba(16, 185, 129, 0.2)' : status.score >= 40 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: status.score > 60 ? '#10b981' : status.score >= 40 ? '#f59e0b' : '#ef4444',
                            borderRadius: '10px',
                            fontWeight: 'bold'
                        }}>
                            STATUS: {status.status.toUpperCase()}
                        </div>

                        {status.score > 60 && (
                            <div className="mt-6">
                                <Button variant="primary" className="w-full" onClick={proceedToRound2} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                                    🚀 Proceed to Next Round
                                </Button>
                            </div>
                        )}
                        <p className="mt-4" style={{ opacity: 0.6 }}>Application ID: {status.id}</p>
                    </div>
                </Card>

                <Card>
                    <h3>Detailed Score Breakdown</h3>
                    <ScoreItem label="Skills Analysis" value={result.analysis.breakdown.skills} feedback={result.analysis.feedback?.skills} />
                    <ScoreItem label="Experience" value={result.analysis.breakdown.experience} feedback={result.analysis.feedback?.experience} />
                    <ScoreItem label="EducationAnalysis" value={result.analysis.breakdown.education} feedback={result.analysis.feedback?.education} />
                    <ScoreItem label="Projects" value={result.analysis.breakdown.projects} feedback={result.analysis.feedback?.projects} />
                    <ScoreItem label="ATS / Formatting" value={result.analysis.breakdown.format} feedback={result.analysis.feedback?.ats} />
                </Card>

                <AIInsightSection analysis={result.analysis.ai_analysis} />

                <Card className="span-2">
                    <h3>Matched Skills</h3>
                    <div className="tags">
                        {result.analysis.matched_skills?.map(skill => (
                            <span key={skill} className="tag match">{skill}</span>
                        ))}
                        {(!result.analysis.matched_skills || result.analysis.matched_skills.length === 0) && <small>No direct matches found.</small>}
                    </div>

                    <h3 className="mt-4">Missing Skills</h3>
                    <div className="tags">
                        {result.analysis.missing_skills?.map(skill => (
                            <span key={skill} className="tag missing">{skill}</span>
                        ))}
                    </div>
                </Card>

                <FinalReportSection report={result.analysis.final_report} />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <Card>
                <h2 className="mb-4">Upload Resume</h2>
                <form onSubmit={handleUpload}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" id="fullName" placeholder="John Doe" required />
                    </div>

                    <div className="form-group">
                        <label>Job Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select a role...</option>
                            {Object.keys(roles).map(role => (
                                <option key={role} value={role}>{role.replace(/([A-Z])/g, ' $1').trim()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Resume (PDF/DOCX)</label>
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={(e) => setFile(e.target.files[0])}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Analyzing...' : 'Analyze & Apply'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
