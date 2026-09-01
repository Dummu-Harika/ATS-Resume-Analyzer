// Domain configurations for HR interview system

export const DOMAINS = [
    {
        id: 'cyber-security',
        name: 'Cyber Security',
        description: 'Security analysis, penetration testing, threat detection',
        icon: '🔒'
    },
    {
        id: 'full-stack',
        name: 'Full Stack Development',
        description: 'Frontend, backend, databases, and deployment',
        icon: '💻'
    },
    {
        id: 'data-science',
        name: 'Data Science',
        description: 'Machine learning, data analysis, visualization',
        icon: '📊'
    },
    {
        id: 'java-developer',
        name: 'Java Developer',
        description: 'Java, Spring Boot, microservices, enterprise applications',
        icon: '☕'
    },
    {
        id: 'ai-ml',
        name: 'AI / ML Engineer',
        description: 'Deep learning, neural networks, model deployment',
        icon: '🤖'
    }
];

export const getDomainById = (id) => {
    return DOMAINS.find(d => d.id === id);
};

export const getDomainByName = (name) => {
    return DOMAINS.find(d => d.name === name);
};
