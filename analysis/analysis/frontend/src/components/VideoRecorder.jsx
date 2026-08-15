import React, { useState, useRef, useEffect } from 'react';
import './VideoRecorder.css';

const VideoRecorder = ({ onRecordingComplete, onStreamStart, onStart, onStop }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef({ id: null, val: 0 });


    // Initialize camera stream
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: true
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            if (onStreamStart) onStreamStart(mediaStream);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera/microphone. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const recordedChunksRef = useRef([]);

    const startRecording = () => {
        if (!stream) return;

        recordedChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8,opus'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            if (onRecordingComplete) {
                // Pass the current timer value captured before stopping
                onRecordingComplete(blob, timerRef.current.val);
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000); // Collect data in 1s chunks
        setIsRecording(true);

        if (onStart) onStart();

        // Start timer
        setTimer(0);
        timerRef.current.val = 0;
        timerRef.current.id = setInterval(() => {
            setTimer((prev) => {
                timerRef.current.val = prev + 1;
                return prev + 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            clearInterval(timerRef.current.id);
            setIsRecording(false);

            // Request final data chunks
            mediaRecorderRef.current.stop();

            if (onStop) onStop();
        }
    };


    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (error) {
        return <div className="video-error">{error}</div>;
    }

    return (
        <div className="video-recorder-container">
            <div className={`video-preview-wrapper ${isRecording ? 'recording' : ''}`}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="video-preview"
                />
                {isRecording && <div className="recording-dot"></div>}
                <div className="timer-overlay">{formatTime(timer)}</div>
            </div>

            <div className="video-controls">
                {!isRecording ? (
                    <button className="btn-record start" onClick={startRecording}>
                        <span className="icon">🔴</span> Start Recording
                    </button>
                ) : (
                    <button className="btn-record stop" onClick={stopRecording}>
                        <span className="icon">⏹</span> Stop Recording
                    </button>
                )}
            </div>

            <p className="video-hint">
                {isRecording
                    ? "Recording in progress... Speak clearly and maintain eye contact."
                    : "Ready to record? Ensure you're in a well-lit area."}
            </p>
        </div>
    );
};

export default VideoRecorder;
