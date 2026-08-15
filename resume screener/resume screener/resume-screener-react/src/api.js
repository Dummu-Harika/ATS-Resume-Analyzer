const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const analyzeResume = async (formData) => {
    const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        throw new Error('Analysis failed');
    }
    return response.json();
};

export const submitApplication = async (applicationData) => {
    const response = await fetch(`${API_URL}/apply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
    });
    return response.json();
};

export const fetchCandidates = async () => {
    const response = await fetch(`${API_URL}/candidates`);
    return response.json();
};

export const updateStatus = async (id, status) => {
    const response = await fetch(`${API_URL}/update_status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
    });
    return response.json();
};

export const fetchJobRoles = async () => {
    const response = await fetch(`${API_URL}/jobs`);
    return response.json();
};

export const startRound2 = async (candidateId) => {
    const response = await fetch(`${API_URL}/start_round2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidateId })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error('Failed to start Round 2: ' + text);
    }
    return response.json();
};

export const startRound3 = async (candidateId) => {
    const response = await fetch(`${API_URL}/start_round3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidateId })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error('Failed to start Round 3: ' + text);
    }
    return response.json();
};

export const submitRound2Answer = async (sessionPayload) => {
    // sessionPayload: { session_id, answer }
    const response = await fetch(`${API_URL}/round2/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error('Failed to submit answer: ' + text);
    }
    return response.json();
};

export const deleteCandidate = async (id) => {
    const response = await fetch(`${API_URL}/delete_candidate/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Deletion failed');
    }
    return response.json();
};
