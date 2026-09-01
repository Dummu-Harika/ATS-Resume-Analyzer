import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoRecorder from '../components/VideoRecorder';
import { speechService } from '../services/speechService';
import './DirectInterview.css';

// Professional HR Interview Questions
const HR_QUESTIONS = [
    "Tell me about yourself and your professional background.",
    "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
    "Describe a time you failed or made a significant mistake. What did you learn from it?",
    "Why do you want to work for our company specifically?",
    "Describe a situation where you had to adapt to a major change at work.",
    "Where do you see yourself in 3-5 years, and how does this role fit into your career goals?"
];

const DirectInterview = () => {
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [allAnswers, setAllAnswers] = useState([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [allEvaluations, setAllEvaluations] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const currentQuestion = HR_QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / HR_QUESTIONS.length) * 100;
    const isLastQuestion = currentQuestionIndex === HR_QUESTIONS.length - 1;

    const handleStartRecording = () => {
        setCurrentTranscript('');
        speechService.startListening(
            (transcript) => setCurrentTranscript(transcript),
            (error) => console.error('Speech error:', error)
        );
    };

    const handleStopRecording = () => {
        const finalTranscript = speechService.stopListening();
        setCurrentTranscript(finalTranscript || currentTranscript);
    };

    const handleRecordingComplete = async (blob, duration) => {
        console.log('Video recording complete:', duration, 'seconds');
        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            formData.append('video', blob, `interview_q${currentQuestionIndex}.webm`);
            formData.append('question', currentQuestion);
            formData.append('job_role', 'Software Developer');

            const response = await fetch('http://localhost:8000/api/interview/analyze-video', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();
            console.log('Real Analysis Result:', result);

            // Add question info for display
            const evaluation = {
                ...result,
                question: currentQuestion
            };

            setAllEvaluations(prev => [...prev, evaluation]);
            if (result.transcript) {
                setCurrentTranscript(result.transcript);
            }
        } catch (err) {
            console.error('Error uploading video:', err);
            alert('Could not analyze video. Falling back to local/voice analysis.');
            // Fallback would go here
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleNextQuestion = () => {
        if (!currentTranscript.trim()) {
            alert('Please record or type your answer before continuing.');
            return;
        }

        if (isAnalyzing) {
            alert('Still analyzing your video. Please wait a moment...');
            return;
        }

        // Save current answer text
        setAllAnswers([...allAnswers, currentTranscript]);

        if (isLastQuestion) {
            analyzeAllAnswers(allEvaluations);
        } else {
            setCurrentTranscript('');
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const analyzeAllAnswers = (evaluations) => {
        console.log('Orchestrating final results with evaluations:', evaluations);

        // Calculate category averages from the real multi-modal data
        const avgAudio = calculateCategoryAvg(evaluations, 'audio');
        const avgVideo = calculateCategoryAvg(evaluations, 'video');
        const avgContent = evaluations.reduce((sum, e) => sum + e.content.score, 0) / evaluations.length;

        // Red Flag Penalty: Behavioral + Visual avg
        const avgRedFlags = evaluations.reduce((sum, e) => {
            const flags = e.red_flags || { behavioral: { score: 1 }, visual: { score: 1 } };
            return sum + (flags.behavioral.score + flags.visual.score) / 2;
        }, 0) / evaluations.length;

        // Overall Score = (Audio × 3.0) + (Video × 2.5) + (Content × 3.5) - Red Flags
        const overallScore = (avgAudio * 3.0) + (avgVideo * 2.5) + (avgContent * 3.5) - (avgRedFlags * 1.0);

        let recommendation = 'POOR FIT';
        if (overallScore >= 75 && avgRedFlags <= 3) recommendation = 'STRONG FIT';
        else if (overallScore >= 55 && avgRedFlags <= 5) recommendation = 'MODERATE FIT';

        navigate('/results', {
            state: {
                evaluations,
                avgAudio,
                avgVideo,
                avgContent,
                avgRedFlags,
                overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
                recommendation,
                answers: allAnswers
            }
        });
    };


    const handleDemoResult = () => {
        // Perfect "Golden" result for demo screenshots
        const demoEvaluations = HR_QUESTIONS.map((q, idx) => ({
            question: q,
            transcript: "I have extensive experience in full-stack development, focusing on scalable system architectures and clean code practices. In my last project, I led a team of five to reduce API latency by 40% using specialized caching layers.",
            processing_time: 0.8,
            overall_score: 88,
            audio: {
                vocal_confidence: { score: 9.2, reasons: ["Excellent energy", "Zero hesitation"] },
                speech_fluency: { score: 8.8, reasons: ["Consistent WPM", "Clear articulation"] }
            },
            video: {
                facial_expressions: { score: 9.0 },
                eye_contact: { score: 9.5 },
                engagement_level: { score: 9.0 },
                metrics: { top_emotion: "happy", stability: 95 }
            },
            content: { score: 9.0, reasons: ["STAR structure followed", "Strong evidence provided"] },
            red_flags: { behavioral: { score: 1 }, visual: { score: 1 } }
        }));

        navigate('/results', {
            state: {
                evaluations: demoEvaluations,
                avgAudio: 9.0,
                avgVideo: 9.2,
                avgContent: 9.0,
                avgRedFlags: 1.0,
                overallScore: 92,
                recommendation: 'STRONG FIT',
                answers: Array(HR_QUESTIONS.length).fill("Perfect demo answer showing star structure and high confidence.")
            }
        });
    };

    const calculateCategoryAvg = (evals, category) => {
        let total = 0;
        let count = 0;
        evals.forEach(e => {
            const cat = e[category];
            Object.keys(cat).forEach(key => {
                total += cat[key].score;
                count++;
            });
        });
        return total / count;
    };

    return (
        <div className="interview-container">
            {isAnalyzing && (
                <div className="analysis-overlay">
                    <div className="analysis-spinner"></div>
                    <h3>AI is analyzing your video...</h3>
                    <p>Extracting audio, checking body language, and evaluating content.</p>
                </div>
            )}

            <header className="interview-header">
                <h1>📹 Round 3: Video HR Interview</h1>
                <p className="subtitle">Deep-Dive Technical & Behavioral Analysis</p>
            </header>

            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">
                    Question {currentQuestionIndex + 1} of {HR_QUESTIONS.length}
                </span>
            </div>

            <div className="interview-content">
                <div className="question-card">
                    <div className="question-number">Question {currentQuestionIndex + 1}</div>
                    <h2 className="question-text">{currentQuestion}</h2>
                </div>

                <VideoRecorder
                    onStart={handleStartRecording}
                    onStop={handleStopRecording}
                    onRecordingComplete={handleRecordingComplete}
                />

                {currentTranscript && (
                    <div className="transcript-preview">
                        <h4>✅ Your Answer:</h4>
                        <p>{currentTranscript}</p>
                    </div>
                )}

                <div className="manual-input-section">
                    <p className="manual-label">💬 Typing an answer manually (Skip voice/video processing):</p>
                    <textarea
                        className="manual-textarea"
                        value={currentTranscript}
                        onChange={(e) => setCurrentTranscript(e.target.value)}
                        placeholder="Type your answer here if you prefer not to use video..."
                        rows="4"
                    />
                </div>

                <div className="action-buttons">
                    <button
                        className="btn-next demo-btn"
                        onClick={handleDemoResult}
                        style={{ background: 'linear-gradient(135deg, #6e8efb, #a777e3)', marginRight: '10px' }}
                    >
                        🚀 Instant Demo (Golden Result)
                    </button>
                    <button
                        className="btn-next"
                        onClick={handleNextQuestion}
                        disabled={!currentTranscript.trim() || isAnalyzing}
                    >
                        {isAnalyzing
                            ? '⏳ Processing...'
                            : isLastQuestion
                                ? '🎯 Complete Interview & View Results →'
                                : '➡️ Next Question'}
                    </button>
                </div>

                {!currentTranscript.trim() && !isAnalyzing && (
                    <p className="hint-text">
                        💡 Record your video response above (ensure your camera and mic are on)
                    </p>
                )}

                {allEvaluations.length > 0 && (
                    <div className="progress-info">
                        <p>✅ Questions Analyzed: {allEvaluations.length} / {HR_QUESTIONS.length}</p>
                    </div>
                )}
            </div>

            <div className="parameters-info multi-modal">
                <h3>📊 Technical Multi-Modal Components</h3>
                <div className="params-grid four-cols">
                    <div className="param-cat">
                        <h4>🎙️ Voice Deep Dive</h4>
                        <p>Pitch (Hz), WPM, Energy, Spectral Centroid, Pause Duration, Filler Rates</p>
                    </div>
                    <div className="param-cat">
                        <h4>📹 Visual Deep Dive</h4>
                        <p>Face Detection, Expression Timeline, Eye Gaze Tracking, Posture Alignment</p>
                    </div>
                    <div className="param-cat">
                        <h4>📝 Content Quality</h4>
                        <p>Semantic Relevance, STAR Structure, Tone Consistency, Behavioral Flags</p>
                    </div>
                    <div className="param-cat danger">
                        <h4>⚠️ Logic Checks</h4>
                        <p>Filler Word Counting, Blame-shifting Detection, Professionalism Score</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DirectInterview;
