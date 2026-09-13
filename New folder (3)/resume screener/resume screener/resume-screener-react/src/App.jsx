import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import JobSeeker from './pages/JobSeeker';
import Recruiter from './pages/Recruiter';
import Round2 from './pages/Round2';
import Round3 from './pages/Round3';
import { Sparkles, Shield, UserCheck, Sun, Moon, LogOut, CheckCircle2 } from 'lucide-react';

function Navigation({ theme, toggleTheme }) {
    const location = useLocation();
    const [recruiterAuth, setRecruiterAuth] = useState(false);
    const [recruiterUser, setRecruiterUser] = useState(null);

    useEffect(() => {
        const checkAuth = () => {
            const isAuth = sessionStorage.getItem('recruiter_authenticated') === 'true' || localStorage.getItem('recruiter_authenticated') === 'true';
            setRecruiterAuth(isAuth);
            if (isAuth) {
                try {
                    const profile = JSON.parse(sessionStorage.getItem('recruiter_user') || localStorage.getItem('recruiter_user') || 'null');
                    setRecruiterUser(profile || { name: 'Sarah Jenkins', role: 'Lead Talent Recruiter' });
                } catch (e) {
                    setRecruiterUser({ name: 'Lead Recruiter', role: 'Talent Acquisition' });
                }
            } else {
                setRecruiterUser(null);
            }
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        window.addEventListener('recruiter_auth_change', checkAuth);
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('recruiter_auth_change', checkAuth);
        };
    }, [location.pathname]);

    const handleLogout = () => {
        sessionStorage.removeItem('recruiter_authenticated');
        localStorage.removeItem('recruiter_authenticated');
        sessionStorage.removeItem('recruiter_user');
        localStorage.removeItem('recruiter_user');
        setRecruiterAuth(false);
        setRecruiterUser(null);
        window.dispatchEvent(new Event('recruiter_auth_change'));
        if (location.pathname === '/recruiter') {
            window.location.reload();
        }
    };

    return (
        <header className="saas-header">
            <Link to="/" className="brand-wrapper">
                <div className="brand-icon">
                    <Sparkles size={20} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="brand-text">TalentAI</span>
                        <span className="brand-pill">Enterprise v3.0</span>
                    </div>
                </div>
            </Link>

            {/* Navbar - CLEAN: No Round 2 or Round 3 links! */}
            <nav className="saas-nav">
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}
                    end
                >
                    <UserCheck size={16} />
                    <span>Candidate Portal</span>
                </NavLink>

                <NavLink
                    to="/recruiter"
                    className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}
                >
                    <Shield size={16} />
                    <span>Recruiter Console</span>
                    {recruiterAuth && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    )}
                </NavLink>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Light / Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
                </button>

                {/* Recruiter Profile / Login */}
                {recruiterAuth && recruiterUser ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', border: 'var(--glass-border)', padding: '4px 12px', borderRadius: '30px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>{recruiterUser.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={10} color="#10b981" /> {recruiterUser.role}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out recruiter"
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <Link to="/recruiter" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}>
                        <Shield size={14} /> Recruiter Login
                    </Link>
                )}
            </div>
        </header>
    );
}

export default function App() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('talentai_theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('talentai_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <Router>
            <div className="container">
                <Navigation theme={theme} toggleTheme={toggleTheme} />
                <main className="fade-in">
                    <Routes>
                        <Route path="/" element={<JobSeeker />} />
                        <Route path="/round2" element={<Round2 />} />
                        <Route path="/round3" element={<Round3 />} />
                        <Route path="/recruiter" element={<Recruiter />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}
