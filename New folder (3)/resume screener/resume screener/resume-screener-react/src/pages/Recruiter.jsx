import React, { useState, useEffect, useMemo } from 'react';
import { fetchCandidates, fetchJobRoles, updateStatus, deleteCandidate, recruiterLogin } from '../api';
import { Card, Button, Badge } from '../components/Shared';
import {
    Filter,
    RefreshCw,
    Trash2,
    Search,
    Lock,
    Shield,
    CheckCircle2,
    XCircle,
    UserCheck,
    Award,
    Terminal,
    Mic,
    FileText,
    ArrowRight,
    SlidersHorizontal,
    RotateCcw,
    Layers,
    LayoutDashboard,
    Users,
    Video,
    BarChart3,
    Briefcase,
    Settings,
    LogOut,
    Bell,
    Download,
    Eye,
    ChevronRight,
    TrendingUp,
    Clock,
    Sparkles
} from 'lucide-react';
import {
    MultiRoundProgressTracker,
    CandidateDossierModal
} from '../components/AnalysisComponents';

export default function Recruiter() {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [recruiterUser, setRecruiterUser] = useState(null);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Candidates & Roles state
    const [candidates, setCandidates] = useState([]);
    const [roles, setRoles] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Navigation & View state
    const [activeNav, setActiveNav] = useState('candidates');

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        role: '',
        status: '',
        roundProgress: '', // 'all', 'r1_cleared', 'r2_cleared', 'r3_cleared', 'r1_rejected', 'r2_rejected', 'r3_rejected'
        minScore: 0,
        sortBy: 'score_desc'
    });

    // Check existing auth on mount
    useEffect(() => {
        const checkAuth = () => {
            const storedAuth = sessionStorage.getItem('recruiter_authenticated') === 'true' || localStorage.getItem('recruiter_authenticated') === 'true';
            setIsAuthenticated(storedAuth);
            if (storedAuth) {
                try {
                    const profile = JSON.parse(sessionStorage.getItem('recruiter_user') || localStorage.getItem('recruiter_user') || 'null');
                    setRecruiterUser(profile || { name: 'Sarah Jenkins', role: 'Lead Talent Recruiter', organization: 'TalentAI Global' });
                } catch (e) {
                    setRecruiterUser({ name: 'Sarah Jenkins', role: 'Lead Talent Recruiter', organization: 'TalentAI Global' });
                }
                loadInitialData();
            }
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        window.addEventListener('recruiter_auth_change', checkAuth);
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('recruiter_auth_change', checkAuth);
        };
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [rolesData, candidatesData] = await Promise.all([
                fetchJobRoles().catch(() => ({})),
                fetchCandidates().catch(() => [])
            ]);
            setRoles(rolesData || {});
            setCandidates(candidatesData || []);
        } catch (error) {
            console.error('Data load error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle recruiter login
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoginLoading(true);
        setLoginError('');

        try {
            const data = await recruiterLogin({ email: loginEmail, password: loginPassword });
            if (data.success) {
                sessionStorage.setItem('recruiter_authenticated', 'true');
                const profile = data.recruiter || {
                    name: 'Sarah Jenkins',
                    email: loginEmail || 'recruiter@talentai.io',
                    role: 'Lead Talent Acquisition Partner',
                    organization: 'TalentAI Global'
                };
                sessionStorage.setItem('recruiter_user', JSON.stringify(profile));
                setRecruiterUser(profile);
                setIsAuthenticated(true);
                window.dispatchEvent(new Event('recruiter_auth_change'));
                loadInitialData();
            } else {
                setLoginError('Authentication failed. Please verify credentials.');
            }
        } catch (err) {
            setLoginError(err.message || 'Login failed. Try using demo access.');
        } finally {
            setLoginLoading(false);
        }
    };

    // Quick demo login
    const handleDemoLogin = () => {
        const demoUser = {
            name: 'Sarah Jenkins',
            email: 'recruiter@talentai.io',
            role: 'Lead Talent Acquisition Partner',
            organization: 'TalentAI Global'
        };
        sessionStorage.setItem('recruiter_authenticated', 'true');
        sessionStorage.setItem('recruiter_user', JSON.stringify(demoUser));
        setRecruiterUser(demoUser);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event('recruiter_auth_change'));
        loadInitialData();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('recruiter_authenticated');
        localStorage.removeItem('recruiter_authenticated');
        sessionStorage.removeItem('recruiter_user');
        localStorage.removeItem('recruiter_user');
        setIsAuthenticated(false);
        setRecruiterUser(null);
        window.dispatchEvent(new Event('recruiter_auth_change'));
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
            alert("Update failed: " + error.message);
            loadInitialData();
        }
    };

    const handleDelete = async (e, id) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this candidate application? This action cannot be undone.")) return;

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

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCandidates.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        }
    };

    const toggleSelectId = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilters({
            role: '',
            status: '',
            roundProgress: '',
            minScore: 0,
            sortBy: 'score_desc'
        });
    };

    // FILTERING LOGIC
    const filteredCandidates = useMemo(() => {
        return candidates.filter(c => {
            // Text Search (Name, Email, or Skills)
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const nameMatch = (c.name || '').toLowerCase().includes(term);
                const emailMatch = (c.email || '').toLowerCase().includes(term);
                const idMatch = (c.id || '').toLowerCase().includes(term);
                const skills = [
                    ...(c.analysis?.matched_skills || c.analysis?.matchedSkills || []),
                    ...(c.analysis?.missing_skills || c.analysis?.missingSkills || [])
                ].map(s => String(s).toLowerCase());
                const skillsMatch = skills.some(s => s.includes(term));

                if (!nameMatch && !emailMatch && !idMatch && !skillsMatch) {
                    return false;
                }
            }

            // Role filter
            if (filters.role && c.role !== filters.role) {
                return false;
            }

            // Status filter
            if (filters.status && c.status !== filters.status) {
                return false;
            }

            // Min Score filter
            const r1 = parseFloat(c.score || c.analysis?.overallScore || 0);
            const r2 = c.quiz_score !== undefined && c.quiz_score !== null ? parseFloat(c.quiz_score) : (c.quiz_report_full?.percentage ?? null);
            const r3 = c.interview_score !== undefined && c.interview_score !== null ? parseFloat(c.interview_score) : (c.round3_report?.overall_score ?? null);
            const composite = c.final_result?.composite_score ?? Math.round(
                (r1 * 0.40) + ((r2 || 0) * 0.30) + ((r3 || 0) * 0.30)
            );

            if (composite < filters.minScore) {
                return false;
            }

            // Round Progress Filter
            if (filters.roundProgress) {
                const r1Cleared = r1 >= 60;
                const r2Cleared = r2 !== null && r2 >= 70;
                const r3Cleared = r3 !== null && r3 >= 80;

                switch (filters.roundProgress) {
                    case 'r1_cleared':
                        if (!r1Cleared) return false;
                        break;
                    case 'r2_cleared':
                        if (!r2Cleared) return false;
                        break;
                    case 'r3_cleared':
                        if (!r3Cleared) return false;
                        break;
                    case 'r1_rejected':
                        if (r1Cleared) return false;
                        break;
                    case 'r2_rejected':
                        if (r2 === null || r2Cleared) return false;
                        break;
                    case 'r3_rejected':
                        if (r3 === null || r3Cleared) return false;
                        break;
                    default:
                        break;
                }
            }

            return true;
        }).sort((a, b) => {
            const scoreA = parseFloat(a.final_result?.composite_score ?? a.score ?? 0);
            const scoreB = parseFloat(b.final_result?.composite_score ?? b.score ?? 0);

            if (filters.sortBy === 'score_asc') return scoreA - scoreB;
            if (filters.sortBy === 'score_desc') return scoreB - scoreA;

            if (filters.sortBy === 'r2_desc') {
                const r2A = parseFloat(a.quiz_score ?? a.quiz_report_full?.percentage ?? 0);
                const r2B = parseFloat(b.quiz_score ?? b.quiz_report_full?.percentage ?? 0);
                return r2B - r2A;
            }

            if (filters.sortBy === 'r3_desc') {
                const r3A = parseFloat(a.interview_score ?? a.round3_report?.overall_score ?? 0);
                const r3B = parseFloat(b.interview_score ?? b.round3_report?.overall_score ?? 0);
                return r3B - r3A;
            }

            if (filters.sortBy === 'name_asc') {
                return (a.name || '').localeCompare(b.name || '');
            }

            return scoreB - scoreA;
        });
    }, [candidates, searchTerm, filters]);

    // KPI Metrics calculation matching the reference screenshot cards
    const kpiStats = useMemo(() => {
        const total = candidates.length;
        const r1Cleared = candidates.filter(c => parseFloat(c.score || c.analysis?.overallScore || 0) >= 60).length;
        const r2Cleared = candidates.filter(c => {
            const r2 = c.quiz_score !== undefined && c.quiz_score !== null ? parseFloat(c.quiz_score) : (c.quiz_report_full?.percentage ?? null);
            return r2 !== null && r2 >= 70;
        }).length;
        const r3Cleared = candidates.filter(c => {
            const r3 = c.interview_score !== undefined && c.interview_score !== null ? parseFloat(c.interview_score) : (c.round3_report?.overall_score ?? null);
            return r3 !== null && r3 >= 80;
        }).length;
        const shortlisted = candidates.filter(c => c.status === 'Shortlisted').length;
        const rejected = candidates.filter(c => c.status === 'Rejected').length;
        const available = r1Cleared && r2Cleared ? candidates.filter(c => c.status !== 'Rejected').length : r1Cleared;

        return { total, r1Cleared, r2Cleared, r3Cleared, shortlisted, rejected, available };
    }, [candidates]);

    // --- RECRUITER AUTH LOGIN SCREEN ---
    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '0 1rem' }}>
                <Card className="card-glow-accent fade-in" style={{ padding: '2.5rem 2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            <Shield size={30} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Recruiter Portal</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Sign in to access candidate dossiers, multi-round progress tracking, and hiring verdicts.
                        </p>
                    </div>

                    {loginError && (
                        <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                            {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: 600 }}>Recruiter Email</label>
                            <input
                                type="email"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                placeholder="recruiter@talentai.io"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: 600 }}>Password</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loginLoading}
                            style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                        >
                            {loginLoading ? 'Authenticating...' : 'Sign In as Recruiter'}
                        </Button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: 'var(--glass-border)' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            Testing credentials: <code>recruiter@talentai.io</code> / <code>recruiter123</code>
                        </div>
                        <Button
                            variant="outline"
                            className="btn-sm"
                            onClick={handleDemoLogin}
                            style={{ width: '100%' }}
                        >
                            <UserCheck size={16} /> Quick Demo Access (1-Click)
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // --- RECRUITER AUTHENTICATED CONSOLE (MATCHING USER'S REFERENCE SCREENSHOT) ---
    return (
        <div className="fade-in" style={{ display: 'flex', minHeight: 'calc(100vh - 120px)', gap: '1.5rem', margin: '-0.5rem -1rem 2rem', padding: '0 1rem' }}>
            {/* Left Sidebar (Dark SaaS Sidebar Matching Reference Screenshot) */}
            <aside style={{
                width: '240px',
                flexShrink: 0,
                background: 'var(--bg-card)',
                border: 'var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-subtle)'
            }}>
                <div>
                    {/* Workspace Logo Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0.6rem 1.25rem', borderBottom: 'var(--glass-border)', marginBottom: '1.25rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                            <Layers size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>TalentAI</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enterprise Console</div>
                        </div>
                    </div>

                    {/* MENU SECTION */}
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 0.6rem 0.5rem', textTransform: 'uppercase' }}>
                        Menu
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setActiveNav('dashboard')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'dashboard' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'dashboard' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <LayoutDashboard size={17} />
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => setActiveNav('candidates')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'candidates' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'candidates' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={17} />
                                <span>Candidates</span>
                            </div>
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                background: activeNav === 'candidates' ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                                color: activeNav === 'candidates' ? '#fff' : 'var(--text-muted)'
                            }}>
                                {candidates.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveNav('interviews')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'interviews' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'interviews' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Video size={17} />
                            <span>Interviews</span>
                        </button>

                        <button
                            onClick={() => setActiveNav('analytics')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'analytics' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'analytics' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <BarChart3 size={17} />
                            <span>Analytics</span>
                        </button>
                    </nav>

                    {/* MANAGEMENT SECTION */}
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 0.6rem 0.5rem', textTransform: 'uppercase' }}>
                        Management
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button
                            onClick={() => setActiveNav('roles')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'roles' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'roles' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <Briefcase size={17} />
                            <span>Open Roles</span>
                        </button>

                        <button
                            onClick={() => setActiveNav('settings')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.65rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeNav === 'settings' ? 'var(--brand-primary)' : 'transparent',
                                color: activeNav === 'settings' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <Settings size={17} />
                            <span>Settings</span>
                        </button>
                    </nav>
                </div>

                {/* Recruiter Profile Box at Bottom */}
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                            {recruiterUser?.name ? recruiterUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'SJ'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {recruiterUser?.name || 'Sarah Jenkins'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {recruiterUser?.role || 'Lead Recruiter'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            {/* Main Console Area */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top Breadcrumb & Quick Action Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Home</span>
                        <ChevronRight size={14} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Candidates</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Quick Shortcut Search Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', borderRadius: '8px', padding: '0.35rem 0.8rem', minWidth: '220px' }}>
                            <Search size={15} color="var(--text-muted)" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search candidates..."
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.84rem', width: '100%' }}
                            />
                            <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-surface)', border: 'var(--glass-border)', color: 'var(--text-muted)' }}>⌘K</span>
                        </div>

                        {/* Notification Bell */}
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
                            <Bell size={16} />
                            <span style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                        </div>

                        {/* Refresh Button */}
                        <Button variant="outline" className="btn-sm" onClick={loadInitialData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* Page Title & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ margin: '0 0 4px', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>Candidates</h1>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Review applicant evaluations, multi-round qualification scores, and AI interview verdicts.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outline" className="btn-sm" onClick={() => alert('Exporting candidate dossier package...')}>
                            <Download size={14} /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* 4 KPI Metric Cards (Matching the user's reference screenshot) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Card 1: Total Candidates (Blue Box) */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-title">Total Applications</div>
                            <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                                <Layers size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{kpiStats.total}</div>
                        <div className="metric-footer" style={{ color: '#10b981' }}>
                            <TrendingUp size={14} />
                            <span>+15% month over month</span>
                        </div>
                    </div>

                    {/* Card 2: Qualified / Available (Green Check) */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-title">Qualified (R1 & R2)</div>
                            <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                                <CheckCircle2 size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{kpiStats.r2Cleared}</div>
                        <div className="metric-footer" style={{ color: 'var(--text-secondary)' }}>
                            <span>75% pass rate through technical quiz</span>
                        </div>
                    </div>

                    {/* Card 3: Disqualified / Unavailable (Red X) */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-title">Disqualified</div>
                            <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                                <XCircle size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{kpiStats.rejected}</div>
                        <div className="metric-footer" style={{ color: '#ef4444' }}>
                            <span>Strict ATS & quiz score thresholds</span>
                        </div>
                    </div>

                    {/* Card 4: Shortlisted (Award / Trend) */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-title">Shortlisted Candidates</div>
                            <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                                <Award size={18} />
                            </div>
                        </div>
                        <div className="metric-value" style={{ color: '#10b981' }}>{kpiStats.shortlisted}</div>
                        <div className="metric-footer" style={{ color: '#10b981' }}>
                            <Sparkles size={14} />
                            <span>Cleared all 3 rounds (Ready for offer)</span>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                        {/* Search Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', padding: '0.45rem 0.8rem', borderRadius: '8px', minWidth: '180px' }}>
                            <Search size={15} color="var(--text-muted)" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name, email, skill..."
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.84rem' }}
                            />
                        </div>

                        {/* Role Filter */}
                        <select
                            value={filters.role}
                            onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
                            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: 'var(--glass-border)', fontSize: '0.84rem' }}
                        >
                            <option value="">All Roles</option>
                            {Object.keys(roles).map(r => (
                                <option key={r} value={r}>{r.replace(/([A-Z])/g, ' $1').trim()}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={filters.status}
                            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: 'var(--glass-border)', fontSize: '0.84rem' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="In Review">In Review</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Rejected">Rejected</option>
                        </select>

                        {/* Round Stage Filter */}
                        <select
                            value={filters.roundProgress}
                            onChange={e => setFilters(prev => ({ ...prev, roundProgress: e.target.value }))}
                            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: 'var(--glass-border)', fontSize: '0.84rem' }}
                        >
                            <option value="">All Round Stages</option>
                            <option value="r1_cleared">✅ Cleared Round 1 (ATS &gt;= 60)</option>
                            <option value="r2_cleared">✅ Cleared Round 2 (Quiz &gt;= 70%)</option>
                            <option value="r3_cleared">✅ Cleared Round 3 (Interview &gt;= 80%)</option>
                            <option value="r1_rejected">❌ Failed Round 1</option>
                            <option value="r2_rejected">❌ Failed Round 2</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Sort Selector */}
                        <select
                            value={filters.sortBy}
                            onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: 'var(--glass-border)', fontSize: '0.84rem' }}
                        >
                            <option value="score_desc">Highest Overall Score</option>
                            <option value="score_asc">Lowest Overall Score</option>
                            <option value="r2_desc">Highest Quiz Score</option>
                            <option value="r3_desc">Highest Interview Score</option>
                            <option value="name_asc">Alphabetical (A-Z)</option>
                        </select>

                        <button
                            onClick={resetFilters}
                            title="Reset all filters"
                            style={{ background: 'transparent', border: 'var(--glass-border)', borderRadius: '8px', padding: '0.45rem 0.7rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}
                        >
                            <RotateCcw size={13} /> Reset
                        </button>
                    </div>
                </div>

                {/* Candidate Data Table (Clean, High-Density SaaS View) */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-subtle)'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="saas-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th>CANDIDATE</th>
                                    <th>ROLE APPLIED</th>
                                    <th>STATUS</th>
                                    <th>ROUND PROGRESS</th>
                                    <th>COMPOSITE SCORE</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                                            Refreshing candidate pool...
                                        </td>
                                    </tr>
                                )}

                                {!loading && filteredCandidates.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            <Users size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                                            No candidates found matching the active filters.
                                            <div style={{ marginTop: '8px' }}>
                                                <Button variant="outline" className="btn-sm" onClick={resetFilters}>Clear Filters</Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading && filteredCandidates.map(candidate => {
                                    const r1 = parseFloat(candidate.score || candidate.analysis?.overallScore || 0);
                                    const r2 = candidate.quiz_score !== undefined && candidate.quiz_score !== null
                                        ? parseFloat(candidate.quiz_score)
                                        : (candidate.quiz_report_full?.percentage ?? null);
                                    const r3 = candidate.interview_score !== undefined && candidate.interview_score !== null
                                        ? parseFloat(candidate.interview_score)
                                        : (candidate.round3_report?.overall_score ?? null);

                                    const compositeScore = candidate.final_result?.composite_score ?? Math.round(
                                        (r1 * 0.40) + ((r2 || 0) * 0.30) + ((r3 || 0) * 0.30)
                                    );

                                    const isShortlisted = candidate.status === 'Shortlisted';
                                    const isRejected = candidate.status === 'Rejected';
                                    const isOnHold = candidate.status === 'On Hold';
                                    const isSelected = selectedIds.has(candidate.id);

                                    return (
                                        <tr key={candidate.id} style={{ background: isSelected ? 'var(--bg-elevated)' : undefined }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectId(candidate.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Candidate Avatar & Info */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: isShortlisted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                                        color: isShortlisted ? '#10b981' : 'var(--brand-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem',
                                                        flexShrink: 0,
                                                        border: isShortlisted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)'
                                                    }}>
                                                        {candidate.name ? candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                                                            {candidate.name || 'Anonymous Candidate'}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {candidate.email || candidate.id} • {candidate.timestamp || 'Recent'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {candidate.role || 'General Role'}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td>
                                                {isShortlisted ? (
                                                    <span className="badge-pill badge-passed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={12} /> Shortlisted
                                                    </span>
                                                ) : isRejected ? (
                                                    <span className="badge-pill badge-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <XCircle size={12} /> Rejected
                                                    </span>
                                                ) : isOnHold ? (
                                                    <span className="badge-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> On Hold
                                                    </span>
                                                ) : (
                                                    <span className="badge-pill badge-active">
                                                        {candidate.status || 'In Review'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Round Progress Indicators */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {/* Round 1 Badge */}
                                                    <span
                                                        title={`Round 1 (ATS): ${r1}%`}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 7px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            background: r1 >= 60 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: r1 >= 60 ? '#10b981' : '#f87171',
                                                            border: r1 >= 60 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}
                                                    >
                                                        R1: {r1}%
                                                    </span>

                                                    {/* Round 2 Badge */}
                                                    <span
                                                        title={r2 !== null ? `Round 2 (Tech Quiz): ${r2}%` : 'Round 2 Not Started'}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 7px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            background: r2 !== null ? (r2 >= 70 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)') : 'var(--bg-elevated)',
                                                            color: r2 !== null ? (r2 >= 70 ? '#10b981' : '#f87171') : 'var(--text-muted)',
                                                            border: 'var(--glass-border)'
                                                        }}
                                                    >
                                                        R2: {r2 !== null ? `${r2}%` : '—'}
                                                    </span>

                                                    {/* Round 3 Badge */}
                                                    <span
                                                        title={r3 !== null ? `Round 3 (AI Voice Interview): ${r3}%` : 'Round 3 Not Started'}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 7px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            background: r3 !== null ? (r3 >= 80 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)') : 'var(--bg-elevated)',
                                                            color: r3 !== null ? (r3 >= 80 ? '#10b981' : '#f59e0b') : 'var(--text-muted)',
                                                            border: 'var(--glass-border)'
                                                        }}
                                                    >
                                                        R3: {r3 !== null ? `${r3}%` : '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Composite Score Gauge */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '48px', height: '6px', background: 'var(--bg-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${Math.min(100, compositeScore)}%`,
                                                            height: '100%',
                                                            background: compositeScore >= 80 ? '#10b981' : (compositeScore >= 65 ? '#818cf8' : '#ef4444'),
                                                            borderRadius: '999px'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: compositeScore >= 80 ? '#10b981' : 'var(--text-primary)' }}>
                                                        {compositeScore}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <Button
                                                        variant="outline"
                                                        className="btn-sm"
                                                        onClick={() => setSelectedCandidate(candidate)}
                                                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                                    >
                                                        <Eye size={13} /> Dossier
                                                    </Button>

                                                    <button
                                                        onClick={(e) => handleDelete(e, candidate.id)}
                                                        title="Delete application"
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            transition: 'color 0.2s ease'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div style={{ padding: '0.8rem 1.25rem', borderTop: 'var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>Showing {filteredCandidates.length} of {candidates.length} candidates</span>
                        <span>Multi-round qualification: R1 &ge; 60% &bull; R2 &ge; 70% &bull; R3 &ge; 80%</span>
                    </div>
                </div>
            </div>

            {/* Candidate Dossier Modal */}
            {selectedCandidate && (
                <CandidateDossierModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onStatusChange={handleStatusUpdate}
                />
            )}
        </div>
    );
}
