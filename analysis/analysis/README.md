# Round 3: AI-Powered Voice Interview System

A complete end-to-end AI-powered HR interview system that evaluates candidates based on voice answers. Built for hackathons and production use.

## 🎯 Features

- **AI-Powered Question Generation**: Domain-specific questions based on resume and job description
- **Voice Recording & Transcription**: Real-time speech-to-text using Web Speech API
- **4-Parameter Evaluation**:
  - 💪 **Confidence**: Tone certainty and fluency
  - 📋 **Evidence**: Real examples and facts
  - 💡 **Clarity**: Structure and technical correctness
  - ⚠️ **Arrogance**: Professionalism check (lower is better)
- **Smart Recommendations**: SELECT, HOLD, or REJECT with detailed feedback
- **Recruiter Dashboard**: View all candidates and detailed evaluations
- **Modern UI**: Beautiful gradients, animations, and responsive design

## 🧩 Supported Domains

- 🔒 Cyber Security
- 💻 Full Stack Development
- 📊 Data Science
- ☕ Java Developer
- 🤖 AI / ML Engineer

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
analysis/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── prompts.py           # AI prompt templates
│   ├── models.py            # Database models
│   ├── ai_service.py        # Gemini AI integration
│   ├── interview_routes.py  # API endpoints
│   ├── database.py          # Database configuration
│   ├── schemas.py           # Pydantic schemas
│   ├── .env                 # Environment variables
│   └── requirements.txt     # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx              # Landing page
    │   │   ├── VoiceInterview.jsx    # Interview interface
    │   │   ├── FinalResults.jsx      # Results page
    │   │   └── RecruiterDashboard.jsx # Recruiter view
    │   ├── components/
    │   │   ├── AudioRecorder.jsx     # Voice recording
    │   │   └── EvaluationResults.jsx # Score display
    │   ├── services/
    │   │   ├── api.js                # Backend API calls
    │   │   └── speechService.js      # Speech-to-text
    │   ├── config/
    │   │   └── domains.js            # Domain definitions
    │   ├── App.jsx                   # Main app component
    │   └── main.jsx                  # Entry point
    └── package.json
```

## 🔑 Environment Variables

Create a `.env` file in the `backend` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///./interview.db
```

## 📊 API Endpoints

### Interview Management

- `POST /api/interview/start` - Start new interview session
- `POST /api/interview/generate-questions/{session_id}` - Generate 5 questions
- `POST /api/interview/submit-answer/{session_id}` - Submit voice answer
- `GET /api/interview/evaluation/{session_id}/{question_number}` - Get evaluation
- `GET /api/interview/final-score/{session_id}` - Get final assessment

### Recruiter

- `GET /api/interview/sessions` - List all sessions
- `GET /api/interview/session/{session_id}/details` - Get full session details

## 🎨 UI Highlights

- **Modern Design**: Glassmorphism, gradients, and smooth animations
- **Responsive**: Works on desktop, tablet, and mobile
- **Accessible**: Clear labels, good contrast, keyboard navigation
- **Professional**: Clean, recruiter-friendly interface

## 🧠 AI Evaluation Logic

### Scoring Formula

```
Overall Score = ((avg_confidence + avg_evidence + avg_clarity - avg_arrogance) / 30) * 100
```

### Recommendations

- **SELECT** (75-100): Strong hire, confident and clear
- **HOLD** (50-74): Potential candidate, needs improvement
- **REJECT** (0-49): Lacks clarity, evidence, or professionalism

## 🔧 Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database
- **Google Gemini**: AI for question generation and evaluation
- **Pydantic**: Data validation

### Frontend
- **React**: UI library
- **Vite**: Build tool
- **React Router**: Navigation
- **Web Speech API**: Voice recognition
- **Modern CSS**: Gradients, animations, flexbox/grid

## 🎯 Usage Flow

1. **Candidate** fills in details and selects domain
2. **AI generates** 5 personalized interview questions
3. **Candidate records** voice answers for each question
4. **AI evaluates** each answer on 4 parameters
5. **System calculates** final score and recommendation
6. **Recruiter views** all candidates and detailed evaluations

## 🚀 Deployment

### Backend (Python)
- Deploy to Railway, Render, or AWS Lambda
- Set environment variables
- Use PostgreSQL for production database

### Frontend (React)
- Build: `npm run build`
- Deploy to Vercel, Netlify, or AWS S3
- Update API URL in environment variables

## 📝 License

MIT License - feel free to use for hackathons and production!

## 🤝 Contributing

This is a hackathon project. Feel free to fork and improve!

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for Round 3 HR Interviews**
