import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder';
import EvaluationResults from '../components/EvaluationResults';
import { api } from '../services/api';
import './VoiceInterview.css';

const VoiceInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const sessionData = location.state;

    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [currentEvaluation, setCurrentEvaluation] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        initializeInterview();
    }, []);

    const initializeInterview = async () => {
        try {
            setLoading(true);

            // Start session
            const sessionResponse = await api.startSession(sessionData);
            setSession(sessionResponse);

            // Generate questions
            const questionsResponse = await api.generateQuestions(sessionResponse.id);
            setQuestions(questionsResponse);

            setLoading(false);
        } catch (err) {
            setError('Failed to initialize interview: ' + err.message);
            setLoading(false);
        }
    };

    const handleRecordingComplete = (transcript, duration) => {
        setCurrentTranscript(transcript);
    };

    const handleSubmitAnswer = async () => {
        if (!currentTranscript.trim()) {
            alert('Please record your answer before submitting.');
            return;
        }

        try {
            setSubmitting(true);
            const currentQuestion = questions[currentQuestionIndex];

            // Find question ID (assuming questions have IDs from backend)
            const questionId = currentQuestion.id || (currentQuestionIndex + 1);

            // Submit answer
            const response = await api.submitAnswer(
                session.id,
                questionId,
                currentTranscript,
                0
            );

            // Store answer
            setAnswers(prev => ({
                ...prev,
                [currentQuestionIndex]: {
                    transcript: currentTranscript,
                    evaluation: response.evaluation
                }
            }));

            // Show evaluation
            setCurrentEvaluation(response.evaluation);
            setShowEvaluation(true);
            setSubmitting(false);
        } catch (err) {
            setError('Failed to submit answer: ' + err.message);
            setSubmitting(false);
        }
    };

    const handleNextQuestion = async () => {
        setShowEvaluation(false);
        setCurrentEvaluation(null);
        setCurrentTranscript('');

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // All questions answered, fetch final assessment and navigate
            try {
                setSubmitting(true);
                const finalAssessment = await api.getFinalAssessment(session.id);
                setSubmitting(false);
                navigate('/final-results', { state: finalAssessment });
            } catch (err) {
                setError('Failed to fetch final assessment: ' + err.message);
                setSubmitting(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="interview-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Generating your personalized interview questions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="interview-container">
                <div className="error-box">
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')}>Go Back</button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="interview-container">
            <header className="interview-header">
                <h1>Round 3: HR Interview</h1>
                <p className="candidate-info">
                    {session?.candidate_name} • {session?.domain}
                </p>
            </header>

            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">
                    Question {currentQuestionIndex + 1} of {questions.length}
                </span>
            </div>

            <div className="interview-content">
                <div className="question-card">
                    <div className="question-number">Question {currentQuestionIndex + 1}</div>
                    <h2 className="question-text">{currentQuestion?.question_text}</h2>
                </div>

                {!showEvaluation ? (
                    <>
                        <AudioRecorder
                            onTranscriptChange={setCurrentTranscript}
                            onRecordingComplete={handleRecordingComplete}
                        />

                        <div className="action-buttons">
                            <button
                                className="btn-submit"
                                onClick={handleSubmitAnswer}
                                disabled={submitting || !currentTranscript.trim()}
                            >
                                {submitting ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="submitted-answer">
                            <h3>Your Answer:</h3>
                            <p>{currentTranscript}</p>
                        </div>

                        <EvaluationResults evaluation={currentEvaluation} />

                        <div className="action-buttons">
                            <button className="btn-next" onClick={handleNextQuestion}>
                                {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'View Final Results →'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VoiceInterview;
