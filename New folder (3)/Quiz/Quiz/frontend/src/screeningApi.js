const API_URL = 'http://localhost:8000';

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

export const fetchJobRoles = async () => {
    const response = await fetch(`${API_URL}/jobs`);
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

export const deleteCandidate = async (id) => {
    const response = await fetch(`${API_URL}/delete_candidate/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Deletion failed');
    }
    return response.json();
};
