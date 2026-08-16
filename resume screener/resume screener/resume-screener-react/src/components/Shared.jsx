import React from 'react';

export const Card = ({ children, className = '' }) => (
    <div className={`card ${className}`}>
        {children}
    </div>
);

export const Badge = ({ status }) => {
    const normalizedStatus = typeof status === 'string' ? status : 'submitted';
    const getStatusClass = (s) => {
        switch (s.toLowerCase()) {
            case 'shortlisted': return 'status-shortlisted';
            case 'rejected': return 'status-rejected';
            case 'on hold':
            case 'hold': return 'status-hold';
            default: return 'status-submitted';
        }
    };

    return (
        <span className={`status-badge ${getStatusClass(normalizedStatus)}`}>
            {normalizedStatus}
        </span>
    );
};

export const Button = ({ children, variant = 'primary', onClick, disabled, className = '' }) => (
    <button
        className={`btn btn-${variant} ${className}`}
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
);

export const ProgressBar = ({ label, value, color = 'var(--accent-color)' }) => (
    <div className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <small>{label}</small>
            <small>{value}%</small>
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '8px' }}>
            <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
        </div>
    </div>
);
