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
const INTERVIEW_API_URL = import.meta.env.VITE_INTERVIEW_API_URL || 'http://localhost:8004';

const normalizeEvaluation = (result, question, transcript) => {
    const textConfidence = Number(result.confidence?.score ?? 0);
    const textEvidence = Number(result.evidence?.score ?? 0);
    const textClarity = Number(result.clarity?.score ?? 0);
    const textProfessionalism = Math.max(0, 10 - Number(result.arrogance?.score ?? 0));
    const audio = result.audio || {};
    const video = result.video || {};
    const content = result.content || {};
    const presence = video.professional_presence || {};
    const confidence = audio.vocal_confidence || {};
    const fluency = audio.speech_fluency || {};
    const contentScore = Number(
        content.score ?? result.overall_score ?? ((textEvidence + textClarity + textProfessionalism) / 3)
    );
    return {
        ...result,
        question,
        transcript: transcript || result.transcript || '',
        audio: {
            ...audio,
            vocal_confidence: confidence,
            speech_fluency: fluency,
            emotional_tone: audio.emotional_tone || { score: textConfidence || fluency.score || 0 },
            voice_clarity: audio.voice_clarity || { score: textClarity || fluency.score || 0 },
            tone_consistency: audio.tone_consistency || { score: textConfidence || fluency.score || 0 },
        },
        video: {
            ...video,
            eye_contact: video.eye_contact || { score: presence.score ?? 0 },
            body_language: video.body_language || { score: presence.score ?? 0 },
            facial_expressions: video.facial_expressions || { score: presence.score ?? 0 },
            professional_appearance: video.professional_appearance || { score: presence.score ?? 0 },
            engagement_level: video.engagement_level || { score: presence.score ?? textConfidence },
        },
        content: {
            ...content,
            score: contentScore,
            communication_skills: content.communication_skills || { score: textClarity || 0 },
            cultural_fit: content.cultural_fit || { score: textProfessionalism || 0 },
            motivation: content.motivation || { score: textEvidence || 0 },
            problem_solving: content.problem_solving || { score: textEvidence || 0 },
            professional_maturity: content.professional_maturity || { score: textProfessionalism || 0 },
        },
        red_flags: result.red_flags || { behavioral: { score: 1 }, visual: { score: 1 } },
    };
};

const DirectInterview = () => {
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [allAnswers, setAllAnswers] = useState([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [allEvaluations, setAllEvaluations] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const transcriptRef = useRef('');
    const questionIndexRef = useRef(0);

    const currentQuestion = HR_QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / HR_QUESTIONS.length) * 100;
    const isLastQuestion = currentQuestionIndex === HR_QUESTIONS.length - 1;

    const handleStartRecording = () => {
        setCurrentTranscript('');
        transcriptRef.current = '';
        speechService.startListening(
            (transcript) => {
                transcriptRef.current = transcript;
                setCurrentTranscript(transcript);
            },
            (error) => console.error('Speech error:', error)
        );
    };

    const handleStopRecording = () => {
        const finalTranscript = speechService.stopListening();
        const transcript = finalTranscript || transcriptRef.current;
        transcriptRef.current = transcript;
        setCurrentTranscript(transcript);
    };

    const handleRecordingComplete = async (blob, duration) => {
        const answerTranscript = transcriptRef.current.trim();
        const questionIndex = questionIndexRef.current;
        const questionText = HR_QUESTIONS[questionIndex];
        console.log('Video recording complete:', duration, 'seconds');
        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            formData.append('video', blob, `interview_q${currentQuestionIndex}.webm`);
            formData.append('question', questionText);
            formData.append('job_role', 'Software Developer');

            const response = await fetch(`${INTERVIEW_API_URL}/api/interview/analyze-video`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();
            console.log('Real Analysis Result:', result);

            // Add question info for display
            const evaluation = normalizeEvaluation(result, questionText, answerTranscript);

            setAllEvaluations(prev => {
                const next = [...prev];
                next[questionIndex] = evaluation;
                return next;
            });
        } catch (err) {
            console.error('Error uploading video:', err);
            setCurrentTranscript(answerTranscript || 'Video response recorded.');
            alert('Video analysis failed. You can still submit the transcript for AI evaluation.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleNextQuestion = async () => {
        if (!currentTranscript.trim()) {
            alert('Please record or type your answer before continuing.');
            return;
        }

        if (isAnalyzing) {
            alert('Still analyzing your video. Please wait a moment...');
            return;
        }

        const answerTranscript = transcriptRef.current.trim() || currentTranscript.trim();
        const nextAnswers = [...allAnswers];
        nextAnswers[currentQuestionIndex] = answerTranscript;
        setAllAnswers(nextAnswers);

        if (!allEvaluations[currentQuestionIndex]) {
            try {
                setIsAnalyzing(true);
                const response = await fetch(`${INTERVIEW_API_URL}/api/evaluate-answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: currentQuestion, answer: answerTranscript, question_number: currentQuestionIndex + 1 })
                });
                if (!response.ok) throw new Error('Text answer evaluation failed');
                const result = await response.json();
                const evaluation = normalizeEvaluation(result, currentQuestion, answerTranscript);
                const nextEvaluations = [...allEvaluations];
                nextEvaluations[currentQuestionIndex] = evaluation;
                setAllEvaluations(nextEvaluations);
                if (isLastQuestion) {
                    analyzeAllAnswers(nextEvaluations, nextAnswers);
                    return;
                }
            } catch (err) {
                setError(`Answer evaluation failed: ${err.message}`);
                return;
            } finally {
                setIsAnalyzing(false);
            }
        }

        if (isLastQuestion) {
            speechService.stopListeningClean();
            analyzeAllAnswers(allEvaluations, nextAnswers);
        } else {
            speechService.stopListeningClean();
            setCurrentTranscript('');
            transcriptRef.current = '';
            questionIndexRef.current = currentQuestionIndex + 1;
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const analyzeAllAnswers = (evaluations, answers = allAnswers) => {
        console.log('Orchestrating final results with evaluations:', evaluations);

        // Calculate category averages from the real multi-modal data
        const avgAudio = calculateCategoryAvg(evaluations, 'audio');
        const avgVideo = calculateCategoryAvg(evaluations, 'video');
        const completedEvaluations = evaluations.filter(Boolean);
        const avgContent = completedEvaluations.length
            ? completedEvaluations.reduce((sum, e) => sum + Number(e.content?.score || 0), 0) / completedEvaluations.length
            : 0;

        // Red Flag Penalty: Behavioral + Visual avg
        const avgRedFlags = completedEvaluations.reduce((sum, e) => {
            const flags = e.red_flags || { behavioral: { score: 1 }, visual: { score: 1 } };
            return sum + (flags.behavioral.score + flags.visual.score) / 2;
        }, 0) / (completedEvaluations.length || 1);

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
                answers
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
        evals.filter(Boolean).forEach(e => {
            const cat = e[category];
            if (!cat) return;
            Object.values(cat).forEach(value => {
                if (value && typeof value.score === 'number') {
                    total += value.score;
                    count++;
                }
            });
        });
        return count ? total / count : 0;
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
                    key={`video-q-${currentQuestionIndex}`}
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
                        onChange={(e) => {
                            transcriptRef.current = e.target.value;
                            setCurrentTranscript(e.target.value);
                        }}
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
