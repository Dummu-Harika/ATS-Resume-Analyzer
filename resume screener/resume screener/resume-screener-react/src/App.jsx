import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import JobSeeker from './pages/JobSeeker';
import Recruiter from './pages/Recruiter';
import Round2 from './pages/Round2';
import Round3 from './pages/Round3';

function App() {
    return (
        <Router>
            <div className="container">
                <header>
                    <div className="logo">Resume Analyzer</div>
                    <nav>
                        <Link to="/" className="btn btn-outline btn-sm" style={{ marginRight: '1rem' }}>Job Seeker</Link>
                        <Link to="/recruiter" className="btn btn-outline btn-sm">Recruiter</Link>
                    </nav>
                </header>

                <main>
                    <Routes>
                        <Route path="/" element={<JobSeeker />} />
                        <Route path="/recruiter" element={<Recruiter />} />
                        <Route path="/round2" element={<Round2 />} />
                        <Route path="/round3" element={<Round3 />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
