import React, { useState, useEffect } from 'react';
import { fetchCandidates, fetchJobRoles, updateStatus, deleteCandidate } from '../screeningApi';
import { Card, Button, Badge } from './Shared';
import { AIInsightSection, FinalReportSection } from './AnalysisComponents';

// Mock Lucide-like icons to avoid package dependency issues if not installed
const RefreshIcon = ({ className }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6m-9.7 1a10 10 0 1 1 2.7 6.3l-5 5" />
    </svg>
);

const TrashIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
);

const FilterIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
);

export default function Recruiter() {
    const [candidates, setCandidates] = useState([]);
    const [roles, setRoles] = useState({});
    const [filters, setFilters] = useState({ role: '', score: 0, status: '' });
    const [loading, setLoading] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [viewingResumeUrl, setViewingResumeUrl] = useState('');

    useEffect(() => {
        fetchJobRoles().then(setRoles).catch(console.error);
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchCandidates();
            setCandidates(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateStatus(id, newStatus);
            setCandidates(prev => prev.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            ));
            if (selectedCandidate?.id === id) {
                setSelectedCandidate(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            alert("Update failed");
            loadData();
        }
    };

    const handleDelete = async (e, id) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this candidate?")) return;

        try {
            await deleteCandidate(id);
            setCandidates(prev => prev.filter(c => c.id !== id));
            if (selectedCandidate?.id === id) {
                setSelectedCandidate(null);
            }
        } catch (error) {
            alert("Deletion failed: " + error.message);
        }
    };

    const filteredCandidates = candidates
        .filter(c => {
            const score = parseFloat(c.score || 0);
            const matchesScore = score >= (filters.score || 0);
            const matchesRole = !filters.role || c.role === filters.role;
            const matchesStatus = !filters.status || c.status === filters.status;
            return matchesScore && matchesRole && matchesStatus;
        })
        .sort((a, b) => parseFloat(b.score || 0) - parseFloat(a.score || 0));

    return (
        <div className="fade-in">
            {selectedCandidate ? (
                <div className="fade-in">
                    <Button variant="outline" className="mb-6" onClick={() => setSelectedCandidate(null)} style={{ marginBottom: '2rem' }}>
                        ← Back to Candidate Pool
                    </Button>

                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <Card style={{
                            gridColumn: 'span 2',
                            background: selectedCandidate.analysis?.recommendation === 'SHORTLIST' ? 'rgba(16, 185, 129, 0.1)' :
                                selectedCandidate.analysis?.recommendation === 'REJECT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: '2px solid ' + (selectedCandidate.analysis?.recommendation === 'SHORTLIST' ? '#10b981' :
                                selectedCandidate.analysis?.recommendation === 'REJECT' ? '#ef4444' : '#f59e0b'),
                            textAlign: 'center'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>AI Recruitment Verdict</h2>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '10px' }}>
                                {selectedCandidate.analysis?.recommendation || 'EVALUATING'}
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.9 }}>
                                {selectedCandidate.analysis?.recommendation_reasoning}
                            </p>
                        </Card>

                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{selectedCandidate.name}</h2>
                                    <p style={{ color: '#818cf8', fontWeight: '500' }}>{selectedCandidate.role}</p>
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <Badge status={selectedCandidate.status} />
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {selectedCandidate.id}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="score-circle" style={{
                                            width: '60px', height: '60px', fontSize: '1rem',
                                            '--percentage': `${selectedCandidate.score}%`,
                                            color: selectedCandidate.score > 60 ? '#10b981' : selectedCandidate.score >= 40 ? '#f59e0b' : '#ef4444'
                                        }}>
                                            <span className="score-value">{selectedCandidate.score}</span>
                                        </div>
                                        <small style={{ color: '#94a3b8', marginTop: '5px', display: 'block' }}>ATS Score</small>
                                    </div>

                                    {selectedCandidate.quiz_score !== undefined && (
                                        <div style={{ textAlign: 'center' }}>
                                            <div className="score-circle" style={{
                                                width: '60px', height: '60px', fontSize: '1rem',
                                                '--percentage': `${selectedCandidate.quiz_score}%`,
                                                color: selectedCandidate.quiz_score >= 60 ? '#10b981' : '#f59e0b'
                                            }}>
                                                <span className="score-value">{selectedCandidate.quiz_score.toFixed(0)}</span>
                                            </div>
                                            <small style={{ color: '#94a3b8', marginTop: '5px', display: 'block' }}>Quiz Score</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ color: '#a78bfa', marginBottom: '1rem' }}>Recruiter Actions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <Button onClick={() => handleStatusUpdate(selectedCandidate.id, 'Shortlisted')} style={{ background: '#10b981' }}>✅ Shortlist Candidate</Button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedCandidate.id, 'On Hold')} style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>⏳ Hold</Button>
                                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedCandidate.id, 'Rejected')} style={{ color: '#f87171', borderColor: '#f87171' }}>❌ Reject</Button>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (selectedCandidate.resume_url) {
                                            setViewingResumeUrl(selectedCandidate.resume_url);
                                            setShowResumeModal(true);
                                        } else {
                                            alert("Resume not available for this candidate. Only resumes uploaded after the recent fix will be viewable.");
                                        }
                                    }}
                                    style={{
                                        marginTop: '8px',
                                        background: selectedCandidate.resume_url ? 'rgba(129, 140, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        borderColor: selectedCandidate.resume_url ? 'rgba(129, 140, 248, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        color: selectedCandidate.resume_url ? '#818cf8' : '#64748b'
                                    }}
                                >
                                    📄 View Original Resume
                                </Button>
                            </div>
                        </Card>

                        <AIInsightSection analysis={selectedCandidate.analysis?.ai_analysis} />

                        <div style={{ gridColumn: 'span 2' }}>
                            <FinalReportSection report={selectedCandidate.analysis?.final_report} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <Card style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Candidate Pool</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                                <FilterIcon size={18} />
                                <select
                                    value={filters.role}
                                    onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
                                    style={{ background: 'transparent', border: 'none', color: 'white', padding: '5px' }}
                                >
                                    <option value="">All Roles</option>
                                    {Object.keys(roles).map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <select
                                    value={filters.status}
                                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ background: 'transparent', border: 'none', color: 'white', padding: '5px' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Shortlisted">Shortlisted</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                <Button variant="outline" onClick={loadData} disabled={loading} style={{ padding: '4px 8px' }}>
                                    <RefreshIcon className={loading ? 'spin' : ''} />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredCandidates.map(c => (
                            <Card key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{c.name}</h3>
                                        <p style={{ fontSize: '0.8rem', color: '#818cf8', margin: '4px 0' }}>{c.role}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div className="score-circle" style={{
                                                width: '40px', height: '40px', fontSize: '0.8rem',
                                                '--percentage': `${c.score}%`,
                                                color: c.score > 60 ? '#10b981' : c.score >= 40 ? '#f59e0b' : '#ef4444'
                                            }}>
                                                <span className="score-value">{c.score}</span>
                                            </div>
                                            <small style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', marginTop: '2px' }}>ATS</small>
                                        </div>

                                        {c.quiz_score !== undefined && (
                                            <div style={{ textAlign: 'center' }}>
                                                <div className="score-circle" style={{
                                                    width: '40px', height: '40px', fontSize: '0.8rem',
                                                    '--percentage': `${c.quiz_score}%`,
                                                    color: c.quiz_score >= 60 ? '#10b981' : '#f59e0b',
                                                    borderColor: 'rgba(99, 102, 241, 0.3)'
                                                }}>
                                                    <span className="score-value">{c.quiz_score.toFixed(0)}</span>
                                                </div>
                                                <small style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', marginTop: '2px' }}>Quiz</small>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Badge status={c.status} />
                                    <div style={{ textAlign: 'right' }}>
                                        <small style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>AI Verdict</small>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            color: c.analysis?.recommendation === 'SHORTLIST' ? '#10b981' :
                                                c.analysis?.recommendation === 'REJECT' ? '#ef4444' : '#f59e0b'
                                        }}>
                                            {c.analysis?.recommendation || 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                    <Button variant="primary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setSelectedCandidate(c)}>
                                        Review Analysis
                                    </Button>
                                    <Button variant="outline" style={{ padding: '0.5rem', width: '40px' }} onClick={(e) => handleDelete(e, c.id)}>
                                        <TrashIcon />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredCandidates.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                            No candidates found matching the filters.
                        </div>
                    )}
                </>
            )}

            {showResumeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '40px'
                }} onClick={() => setShowResumeModal(false)}>
                    <div style={{
                        width: '100%',
                        maxWidth: '1000px',
                        height: '90vh',
                        background: '#1e293b',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            padding: '16px 24px',
                            background: '#334155',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Resume Viewer</h3>
                            <button
                                onClick={() => setShowResumeModal(false)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <iframe
                                src={viewingResumeUrl}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Resume PDF View"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
