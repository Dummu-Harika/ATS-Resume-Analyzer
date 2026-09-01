import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { startRound3 } from '../api';
import { Card, Button } from '../components/Shared';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function Round3() {
    const query = useQuery();
    const candidateId = query.get('candidate_id') || sessionStorage.getItem('current_candidate_id') || sessionStorage.getItem('round2_candidate_id');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);

    useEffect(() => {
        if (!candidateId) {
            setError('No candidate session found. Please return to the application flow and continue from Round 2.');
            return;
        }

        const init = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await startRound3(candidateId);
                setSession(data);
                if (data?.candidate_id) {
                    sessionStorage.setItem('current_candidate_id', data.candidate_id);
                }
            } catch (err) {
                setError(err.message || 'Unable to start the AI interview.');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [candidateId]);

    const launchInterview = () => {
        if (!session?.interview_url) {
            setError('Interview URL is not available yet.');
            return;
        }
        window.open(session.interview_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="max-w-3xl mx-auto" style={{ padding: '2rem' }}>
            <Card>
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Round 3</div>
                    <h2 style={{ margin: '0.25rem 0 0' }}>AI Interview</h2>
                </div>

                {loading && (
                    <div style={{ color: '#e2e8f0' }}>Preparing your AI interview session...</div>
                )}

                {error && (
                    <div style={{ color: '#fca5a5', background: 'rgba(127, 29, 29, 0.35)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
                        {error}
                    </div>
                )}

                {session && (
                    <>
                        <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b', marginBottom: '1rem' }}>
                            <p style={{ margin: '0 0 0.5rem', color: '#94a3b8' }}>Candidate</p>
                            <h3 style={{ margin: 0 }}>{session.candidate_name}</h3>
                            <p style={{ margin: '0.4rem 0 0', color: '#cbd5e1' }}>Role: {session.domain}</p>
                            <p style={{ margin: '0.25rem 0 0', color: '#cbd5e1' }}>Session ID: {session.session_id}</p>
                        </div>

                        <Button onClick={launchInterview} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                            Launch AI Interview
                        </Button>
                    </>
                )}
            </Card>
        </div>
    );
}
