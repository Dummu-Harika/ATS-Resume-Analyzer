// Speech-to-text service using Web Speech API

class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';

        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
        }
    }

    isSupported() {
        return this.recognition !== null;
    }

    startListening(onTranscript, onError) {
        if (!this.recognition) {
            onError('Speech recognition not supported in this browser');
            return;
        }

        this.transcript = '';
        this.isListening = true;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcript = finalTranscript || interimTranscript;
            onTranscript(this.transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            onError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            onError(error.message);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
        return this.transcript;
    }

    getTranscript() {
        return this.transcript;
    }
}

export const speechService = new SpeechService();
