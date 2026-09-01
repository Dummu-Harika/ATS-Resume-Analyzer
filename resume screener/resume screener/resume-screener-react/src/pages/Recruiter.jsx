import React, { useState, useEffect } from 'react';
import { fetchCandidates, fetchJobRoles, updateStatus, deleteCandidate } from '../api';
import { Card, Button, Badge } from '../components/Shared';
import { Filter, RefreshCw, Trash2, FileText } from 'lucide-react';
import { AIInsightSection, FinalReportSection } from '../components/AnalysisComponents';

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
        if (!window.confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) return;

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

    console.log(`DEBUG: Total: ${candidates.length}, Filtered: ${filteredCandidates.length}, Filters:`, filters);

    const openReport = (e, candidate) => {
        e.stopPropagation();
        setSelectedCandidate(candidate);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ position: 'relative', minHeight: '80vh' }}>
            {selectedCandidate ? (
                <div className="fade-in">
                    <Button variant="outline" className="mb-6" onClick={() => setSelectedCandidate(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ← Back to Candidate Pool
                    </Button>

                    <div className="dashboard-grid fade-in">
                        <Card className="span-2" style={{
                            background: selectedCandidate.analysis?.recommendation === 'SHORTLIST' ? 'rgba(16, 185, 129, 0.15)' :
                                selectedCandidate.analysis?.recommendation === 'REJECT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            border: '2px solid ' + (selectedCandidate.analysis?.recommendation === 'SHORTLIST' ? '#10b981' :
                                selectedCandidate.analysis?.recommendation === 'REJECT' ? '#ef4444' : '#f59e0b'),
                            textAlign: 'center',
                            padding: '1.5rem'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>Hiring Eligibility Verdict</h2>
                            <div style={{ fontSize: '3rem', fontWeight: '900', marginTop: '10px' }}>
                                {selectedCandidate.analysis?.recommendation || 'EVALUATING'}
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '1rem', opacity: 0.9 }}>
                                {selectedCandidate.analysis?.recommendation_reasoning}
                            </p>
                        </Card>

                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{selectedCandidate.name}</h2>
                                    <p style={{ color: '#818cf8', fontWeight: '500' }}>{selectedCandidate.role}</p>
                                    <div className="mt-2" style={{ display: 'flex', gap: '10px' }}>
                                        <Badge status={selectedCandidate.status} />
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {selectedCandidate.id?.slice(-8)}</span>
                                    </div>
                                </div>
                                <div className="score-circle" style={{
                                    width: '80px', height: '80px', fontSize: '1.4rem',
                                    '--percentage': `${selectedCandidate.score}%`,
                                    color: selectedCandidate.score > 60 ? '#10b981' : selectedCandidate.score >= 40 ? '#f59e0b' : '#ef4444'
                                }}>
                                    <span className="score-value">{selectedCandidate.score}</span>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ color: '#a78bfa', marginBottom: '15px' }}>Recruiter Actions</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                <Button variant="primary" onClick={() => handleStatusUpdate(selectedCandidate.id, 'Shortlisted')} style={{ background: '#10b981', py: '1rem' }}>✅ Shortlist Candidate</Button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedCandidate.id, 'On Hold')} style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>⏳ Hold</Button>
                                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedCandidate.id, 'Rejected')} style={{ color: '#f87171', borderColor: '#f87171' }}>❌ Reject</Button>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={(e) => handleDelete(e, selectedCandidate.id)}
                                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', marginTop: '8px', background: 'rgba(239, 68, 68, 0.05)' }}
                                >
                                    <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete Application Permanently
                                </Button>
                                {selectedCandidate.resume_url && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setViewingResumeUrl(selectedCandidate.resume_url);
                                            setShowResumeModal(true);
                                        }}
                                        style={{ marginTop: '8px', background: 'rgba(129, 140, 248, 0.1)', borderColor: 'rgba(129, 140, 248, 0.3)', color: '#818cf8' }}
                                    >
                                        📄 View Original Resume
                                    </Button>
                                )}
                            </div>
                        </Card>

                        <AIInsightSection analysis={selectedCandidate.analysis} />

                        <div className="span-2">
                            <FinalReportSection report={selectedCandidate.analysis?.final_report} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <Card className="mb-6">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ fontSize: '1.5rem' }}>Candidate Pool</h2>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '0.6rem 1rem', borderRadius: '12px' }}>
                                <Filter size={18} color="#818cf8" />

                                <select
                                    value={filters.role}
                                    onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
                                    style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                                >
                                    <option value="">All Roles</option>
                                    {Object.keys(roles).map(r => (
                                        <option key={r} value={r}>{r.replace(/([A-Z])/g, ' $1').trim()}</option>
                                    ))}
                                </select>

                                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

                                <select
                                    value={filters.status}
                                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Shortlisted">Shortlisted</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Rejected">Rejected</option>
                                </select>

                                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Min Score: {filters.score}</label>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={filters.score}
                                        onChange={e => setFilters(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </div>

                                <Button variant="outline" onClick={loadData} disabled={loading} className="btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="dashboard-grid">
                        {filteredCandidates.map((candidate, index) => (
                            <Card key={`${candidate.id}-${index}`} className="candidate-card" style={{ transition: 'all 0.3s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ marginBottom: '4px', fontSize: '1.2rem' }}>{candidate.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: '500' }}>{candidate.role?.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></span>
                                            <small style={{ color: '#64748b' }}>#{candidate.id?.slice(-4)}</small>
                                        </div>
                                    </div>
                                    <div className="score-circle" style={{
                                        width: '48px', height: '48px', fontSize: '1rem',
                                        '--percentage': `${candidate.score}%`,
                                        color: candidate.score > 60 ? '#10b981' : candidate.score >= 40 ? '#f59e0b' : '#ef4444'
                                    }}>
                                        <span className="score-value">{candidate.score}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {(candidate.analysis?.matched_skills || candidate.analysis?.matchedSkills)?.slice(0, 3).map(s => (
                                            <span key={s} className="tag match" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{s}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px' }}>
                                    <Badge status={candidate.status} />
                                    <div style={{ textAlign: 'right' }}>
                                        <small style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>AI Verdict</small>
                                        <span style={{
                                            color: candidate.analysis?.recommendation === 'SHORTLIST' ? '#10b981' :
                                                candidate.analysis?.recommendation === 'REJECT' ? '#f87171' : '#fbbf24',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem'
                                        }}>
                                            {candidate.analysis?.recommendation || 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        variant="primary"
                                        style={{ flex: 1, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
                                        onClick={(e) => openReport(e, candidate)}
                                    >
                                        📄 Review
                                    </Button>
                                    <Button
                                        variant="outline"
                                        style={{ width: '45px', padding: '0', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)' }}
                                        onClick={(e) => handleDelete(e, candidate.id)}
                                        title="Delete Application"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </Card>
                        ))}

                        {filteredCandidates.length === 0 && (
                            <div className="col-span-full py-12 text-center" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                                <p style={{ color: '#94a3b8' }}>No candidates found matching your criteria.</p>
                                <Button variant="outline" onClick={() => setFilters({ role: '', score: 0, status: '' })} className="mt-4">Clear All Filters</Button>
                            </div>
                        )}
                    </div>
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
                            <Button
                                variant="outline"
                                onClick={() => setShowResumeModal(false)}
                                style={{ padding: '4px 12px', minWidth: 'auto', fontSize: '1.5rem', border: 'none' }}
                            >
                                ×
                            </Button>
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
