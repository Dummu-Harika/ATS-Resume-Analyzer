const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const parseErrorResponse = async (response) => {
    let detail = '';
    try {
        const data = await response.clone().json();
        detail = data?.detail || data?.message || JSON.stringify(data);
    } catch (e) {
        try {
            detail = await response.text();
        } catch (error) {
            detail = 'Request failed';
        }
    }
    const message = detail || 'Request failed';
    const err = new Error(message);
    err.status = response.status;
    return err;
};

export const analyzeResume = async (formData) => {
    const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
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
        throw await parseErrorResponse(response);
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
        throw await parseErrorResponse(response);
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
        throw await parseErrorResponse(response);
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

export const recruiterLogin = async (credentials) => {
    const response = await fetch(`${API_URL}/recruiter/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
    }
    return response.json();
};

export const submitRound3Result = async (payload) => {
    const response = await fetch(`${API_URL}/submit_round3_result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
    }
    return response.json();
};

export const aggregateCandidate = async (candidateId) => {
    const response = await fetch(`${API_URL}/aggregate_final/${encodeURIComponent(candidateId)}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
    }
    return response.json();
};

