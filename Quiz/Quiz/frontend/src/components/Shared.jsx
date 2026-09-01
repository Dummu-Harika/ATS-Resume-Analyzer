export const Card = ({ children, className = '', style = {} }) => (
    <div className={`glass-card ${className}`} style={style}>
        {children}
    </div>
);

export const Badge = ({ status }) => {
    const getStatusClass = (s) => {
        if (!s) return 'status-submitted';
        switch (s.toLowerCase()) {
            case 'shortlisted': return 'status-shortlisted';
            case 'rejected': return 'status-rejected';
            case 'on hold':
            case 'hold': return 'status-hold';
            default: return 'status-submitted';
        }
    };

    const styles = {
        'status-shortlisted': { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
        'status-rejected': { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
        'status-hold': { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
        'status-submitted': { background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }
    };

    const style = styles[getStatusClass(status)] || styles['status-submitted'];

    return (
        <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            ...style
        }}>
            {status}
        </span>
    );
};

export const Button = ({ children, variant = 'primary', onClick, disabled, className = '', style = {} }) => {
    const isOutline = variant === 'outline';
    const baseStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: '0.75rem',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isOutline ? '1px solid var(--glass-border)' : 'none',
        background: isOutline ? 'transparent' : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
        color: 'white',
        opacity: disabled ? 0.6 : 1,
        ...style
    };

    return (
        <button
            className={`${isOutline ? 'btn-secondary' : 'btn'} ${className}`}
            onClick={onClick}
            disabled={disabled}
            style={baseStyle}
        >
            {children}
        </button>
    );
};
