// Robust Continuous Speech-to-text service using Web Speech API

class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.activeRecording = false;
        this.transcript = '';
        this.finalTranscript = '';
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
    }

    isSupported() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return !!SpeechRecognition;
    }

    startListening(onTranscript, onError) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (onError) onError('Speech recognition not supported in this browser');
            return;
        }

        // Clean up prior session completely
        this.stopListeningClean();

        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError;
        this.transcript = '';
        this.finalTranscript = '';
        this.activeRecording = true;
        this.isListening = true;

        this._createAndStartRecognition();
    }

    _createAndStartRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        try {
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const item = event.results[i];
                    const text = item[0].transcript;
                    if (item.isFinal) {
                        this.finalTranscript += (this.finalTranscript ? ' ' : '') + text.trim();
                    } else {
                        interim += text;
                    }
                }
                const fullText = (this.finalTranscript + (interim ? ' ' + interim : '')).trim();
                this.transcript = fullText;
                if (this.onTranscriptCallback) {
                    this.onTranscriptCallback(this.transcript);
                }
            };

            rec.onerror = (event) => {
                console.warn('Speech recognition warning:', event.error);
                if (event.error === 'not-allowed') {
                    this.activeRecording = false;
                    this.isListening = false;
                    if (this.onErrorCallback) this.onErrorCallback('Microphone permission denied');
                }
            };

            rec.onend = () => {
                // In Chrome, recognition auto-terminates on pauses.
                // Auto-restart if user has not explicitly clicked stop!
                if (this.activeRecording) {
                    try {
                        rec.start();
                    } catch (e) {
                        // ignore if starting
                    }
                } else {
                    this.isListening = false;
                }
            };

            this.recognition = rec;
            rec.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            if (this.onErrorCallback) this.onErrorCallback(error.message);
        }
    }

    stopListening() {
        this.activeRecording = false;
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // ignore
            }
        }
        return (this.finalTranscript || this.transcript).trim();
    }

    stopListeningClean() {
        this.activeRecording = false;
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.onresult = null;
                this.recognition.onerror = null;
                this.recognition.onend = null;
                this.recognition.abort();
            } catch (e) {
                // ignore
            }
            this.recognition = null;
        }
    }

    getTranscript() {
        return this.transcript;
    }
}

export const speechService = new SpeechService();
