# AI-Powered Resume Screening & Analytics System

A sophisticated Full-Stack application designed to automate the initial screening of resumes using a multi-dimensional "Depth-Based" scoring algorithm. The system features a modern React-based interface for both Job Seekers and Recruiters, backed by a robust Python FastAPI server.

---

## 🚀 Key Features

### 1. Dual-Portal Interface
- **Job Seeker Portal**: Upload resumes (PDF/DOCX/TXT), select target roles, and receive instant AI analysis with a detailed score breakdown.
- **Recruiter Dashboard**: View all applications in a centralized dashboard. Filter candidates by job role and minimum score, and manage application statuses (Shortlist, Hold, Reject).

### 2. Depth-Based Scoring Engine
Unlike simple keyword matching, this system evaluates resumes across 5 critical parameters:
- **Skills (40%)**: Precise word-boundary matching against job-specific required skills.
- **Experience (25%)**: Evaluates total years, role title relevance, and career stability.
- **Education (15%)**: Checks for degree matches (B.Tech, M.Tech, etc.) and branch relevance (CSE, IT, etc.).
- **Projects (10%)**: Analyzes project impact using action-keyword detection (Developed, Implemented, Deployed).
- **ATS Quality (10%)**: Evaluates document readability, section structure, and formatting health.

### 3. High-Performance Text Extraction
- Powered by **Python & pypdf**, ensuring lightning-fast and accurate text retrieval from binary PDF formats.
- Optimized regex matching algorithms to reduce processing overhead.

---

## 🛠️ Tech Stack

- **Frontend**: React.js (Vite), React Router, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI (Uvicorn), pypdf.
- **Design**: Modern Dark Mode with Glassmorphism and Responsive Layouts (Vanilla CSS).
- **Storage**: JSON-based persistent storage on the backend.

---

## 📂 Project Structure

```text
resume-screener/
├── backend/                # Python FastAPI Backend
│   ├── main.py             # API Entry Point & Routes
│   ├── config.py           # Job Roles & Skills Configuration
│   ├── data/               # Persistent Storage (JSON)
│   └── utils/
│       ├── parser.py       # PDF/Text Extraction Logic
│       └── analyzer.py     # Depth-Based Scoring Algorithm
├── resume-screener-react/   # React Frontend
│   ├── src/
│   │   ├── api.js          # Backend API Bridge
│   │   ├── pages/          # JobSeeker & Recruiter Views
│   │   └── components/     # Reusable UI Components
│   └── package.json        # JS Dependencies
└── README.md               # Project Documentation
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11 or higher
- Node.js (v18+) & npm

### Backend Setup
1. Navigate to the root directory.
2. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn pypdf python-multipart
   ```
3. Run the backend server:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `resume-screener-react` directory:
   ```bash
   cd resume-screener-react
   ```
2. Install JS dependencies:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```

---

## 📝 Usage for Presentation
- **Dynamic Content**: You can add new job roles by simply updating the `JOB_ROLES` dictionary in `backend/config.py`. The UI and analysis engine will adapt automatically.
- **Detailed Feedback**: The system provides clear "Analysis feedback" for each score, explaining exactly why points were deducted (e.g., "Missing required skill: React" or "Experience < 2 years").
