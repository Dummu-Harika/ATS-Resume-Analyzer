import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS } from '../config/domains';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        candidate_name: '',
        candidate_email: '',
        domain: '',
        resume_skills: '',
        job_description: '',
        resume_summary: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.candidate_name || !formData.candidate_email || !formData.domain) {
            alert('Please fill in all required fields');
            return;
        }

        // Navigate to interview with form data
        navigate('/interview', { state: formData });
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>🎯 Round 3: HR Voice Interview</h1>
                <p className="subtitle">AI-Powered Sentiment & Skill Analysis</p>
                <p className="description">
                    Complete your final interview round with our advanced AI system that evaluates
                    your confidence, evidence, clarity, and professionalism.
                </p>
            </header>

            <div className="form-card">
                <h2>Start Your Interview</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="candidate_name">Full Name *</label>
                        <input
                            type="text"
                            id="candidate_name"
                            name="candidate_name"
                            value={formData.candidate_name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="candidate_email">Email Address *</label>
                        <input
                            type="email"
                            id="candidate_email"
                            name="candidate_email"
                            value={formData.candidate_email}
                            onChange={handleChange}
                            placeholder="your.email@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="domain">Select Domain *</label>
                        <select
                            id="domain"
                            name="domain"
                            value={formData.domain}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Choose your domain...</option>
                            {DOMAINS.map(domain => (
                                <option key={domain.id} value={domain.name}>
                                    {domain.icon} {domain.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="resume_skills">Key Skills (from Resume)</label>
                        <textarea
                            id="resume_skills"
                            name="resume_skills"
                            value={formData.resume_skills}
                            onChange={handleChange}
                            placeholder="E.g., Python, React, AWS, Machine Learning, etc."
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="job_description">Job Description</label>
                        <textarea
                            id="job_description"
                            name="job_description"
                            value={formData.job_description}
                            onChange={handleChange}
                            placeholder="Paste the job description here..."
                            rows="4"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="resume_summary">Resume Summary (Optional)</label>
                        <textarea
                            id="resume_summary"
                            name="resume_summary"
                            value={formData.resume_summary}
                            onChange={handleChange}
                            placeholder="Brief summary of your experience and achievements..."
                            rows="3"
                        />
                    </div>

                    <button type="submit" className="btn-start">
                        Start Interview →
                    </button>
                </form>
            </div>

            <div className="features-section">
                <h3>What We Evaluate</h3>
                <div className="features-grid">
                    <div className="feature-card">
                        <span className="feature-icon">💪</span>
                        <h4>Confidence</h4>
                        <p>Tone certainty, fluency, and assurance in your responses</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">📋</span>
                        <h4>Evidence</h4>
                        <p>Real projects, examples, and measurable outcomes</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">💡</span>
                        <h4>Clarity</h4>
                        <p>Logical structure and technical correctness</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">⚠️</span>
                        <h4>Professionalism</h4>
                        <p>Avoiding arrogance and maintaining humility</p>
                    </div>
                </div>
            </div>

            <div className="recruiter-link">
                <button onClick={() => navigate('/recruiter')} className="btn-recruiter">
                    Recruiter Dashboard →
                </button>
            </div>
        </div>
    );
};

export default Home;
