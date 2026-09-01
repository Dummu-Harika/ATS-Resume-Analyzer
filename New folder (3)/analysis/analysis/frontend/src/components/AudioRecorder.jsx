import { useState, useEffect, useRef } from 'react';
import { speechService } from '../services/speechService';
import './AudioRecorder.css';

const AudioRecorder = ({ onTranscriptChange, onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState('');
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startRecording = () => {
        if (!speechService.isSupported()) {
            setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        setError('');
        setTranscript('');
        setDuration(0);
        setIsRecording(true);

        // Start timer
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);

        // Start speech recognition
        speechService.startListening(
            (text) => {
                setTranscript(text);
                if (onTranscriptChange) {
                    onTranscriptChange(text);
                }
            },
            (err) => {
                setError(`Error: ${err}`);
                stopRecording();
            }
        );
    };

    const stopRecording = () => {
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Get final transcript
        const finalTranscript = speechService.stopListening();
        console.log('Stop recording - final transcript:', finalTranscript);
        console.log('Current transcript state:', transcript);

        // Use whichever is longer/more complete
        const bestTranscript = finalTranscript.length > transcript.length ? finalTranscript : transcript;

        // Update local state
        setTranscript(bestTranscript);

        // Notify parent component immediately
        if (onTranscriptChange) {
            onTranscriptChange(bestTranscript);
        }

        if (onRecordingComplete) {
            onRecordingComplete(bestTranscript, duration);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="audio-recorder">
            <div className="recorder-controls">
                {!isRecording ? (
                    <button
                        className="btn-record"
                        onClick={startRecording}
                        disabled={isRecording}
                    >
                        <span className="record-icon">🎤</span>
                        Start Recording
                    </button>
                ) : (
                    <button
                        className="btn-stop"
                        onClick={stopRecording}
                    >
                        <span className="stop-icon">⏹</span>
                        Stop Recording
                    </button>
                )}

                <div className="timer">{formatTime(duration)}</div>
            </div>

            {isRecording && (
                <div className="recording-indicator">
                    <div className="pulse-dot"></div>
                    <span>Recording in progress...</span>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {transcript && (
                <div className="transcript-box">
                    <h4>Live Transcript:</h4>
                    <p>{transcript}</p>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
