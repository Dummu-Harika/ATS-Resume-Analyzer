import React from 'react';
import { Card } from './Shared';

export const AIInsightSection = ({ analysis }) => {
    if (!analysis) return null;
    return (
        <Card className="span-2 ai-insights" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ AI Deep Analysis (High Thinking)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                    <h4 style={{ color: '#10b981', fontSize: '0.9rem' }}>Key Strengths</h4>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
                        {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 style={{ color: '#f59e0b', fontSize: '0.9rem' }}>Weaknesses</h4>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
                        {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
                <h4 style={{ color: '#6366f1', fontSize: '0.9rem', marginBottom: '5px' }}>Recruitment Recommendation ({analysis.recommendation})</h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                    "{analysis.recommendation_reasoning}"
                </p>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
                <h4 style={{ color: '#fb7185', fontSize: '0.9rem', marginBottom: '10px' }}>Actionable Improvements</h4>
                <ul style={{ listStyle: 'square', paddingLeft: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {analysis.improvements?.map((imp, i) => <li key={i}>{imp}</li>)}
                </ul>
            </div>
        </Card>
    );
};

export const FinalReportSection = ({ report }) => {
    if (!report || Object.keys(report).length === 0) return null;

    return (
        <div className="report-container mt-8" style={{ width: '100%', marginTop: '2rem' }}>
            <h2 className="mb-6" style={{ borderBottom: '2px solid #6366f1', display: 'inline-block', paddingBottom: '8px', marginBottom: '1.5rem' }}>
                📄 Comprehensive Final Report
            </h2>

            <Card style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#6366f1' }}>Executive Summary</h3>
                <p style={{ color: '#e2e8f0', lineHeight: '1.7', fontSize: '1.05rem' }}>
                    {report.executive_summary}
                </p>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <Card>
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>
                        Skills Gap Analysis
                    </h3>
                    <div className="mb-4">
                        <h4 style={{ color: '#f87171', fontSize: '0.9rem' }}>High Priority Gaps</h4>
                        <ul className="mt-2" style={{ listStyle: 'none', padding: 0 }}>
                            {report.skills_gap_analysis?.high_priority_missing?.map((s, i) => (
                                <li key={i} className="mb-1" style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#ef4444', marginRight: '8px' }}>●</span> {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: '#818cf8', fontSize: '0.9rem' }}>Learning Roadmap</h4>
                        <ul className="mt-2" style={{ listStyle: 'circle', paddingLeft: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                            {report.skills_gap_analysis?.learning_roadmap?.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                </Card>

                <Card>
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>
                        Action Plan (Top Priority)
                    </h3>
                    <ul style={{ listStyle: 'decimal', paddingLeft: '20px' }}>
                        {report.action_plan?.map((step, i) => (
                            <li key={i} className="mb-3" style={{ color: i < 2 ? '#fbbf24' : '#e2e8f0', fontWeight: i < 2 ? 'bold' : 'normal' }}>
                                {step}
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <Card>
                    <h3 style={{ color: '#34d399', marginBottom: '15px' }}>Experience Enhancement</h3>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                        {report.experience_enhancement?.map((tip, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{tip}</li>)}
                    </ul>
                </Card>
                <Card>
                    <h3 style={{ color: '#60a5fa', marginBottom: '15px' }}>Project Showcase Tips</h3>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                        {report.project_showcase_tips?.map((tip, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{tip}</li>)}
                    </ul>
                </Card>
            </div>

            <Card style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#a78bfa', marginBottom: '15px' }}>ATS Optimization Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {report.ats_optimization_checklist?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#10b981' }}>✓</span>
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{item}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="mt-8 mb-12" style={{ marginBottom: '3rem' }}>
                <Card style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Category Deep Dive</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                        {Object.entries(report.category_analysis || {}).map(([key, data]) => (
                            <div key={key} className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 className="capitalize" style={{ margin: 0 }}>{key}</h4>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: data.status === 'Strength' ? '#065f46' : '#991b1b',
                                        color: 'white'
                                    }}>{data.status}</span>
                                </div>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <small style={{ color: '#10b981' }}>Strengths: </small>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{data.strengths?.join(', ')}</p>
                                </div>
                                <div>
                                    <small style={{ color: '#f87171' }}>Next Steps: </small>
                                    <ul style={{ fontSize: '0.8rem', color: '#cbd5e1', paddingLeft: '15px' }}>
                                        {data.recommendations?.slice(0, 2).map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
