# TalentAI Enterprise — Autonomous Multi-Round ATS & Interview Screener

> **Enterprise-grade, AI-powered hiring automation platform** combining algorithmic ATS resume parsing, adaptive technical testing, and autonomous voice/video behavioral interviewing into a single unified SaaS funnel.

---

## 🌟 Overview

**TalentAI Enterprise** transforms conventional recruitment into an intelligent, 3-stage candidate qualification pipeline. Instead of static keyword filters or disjointed interview tools, TalentAI orchestrates the entire journey from initial resume submission to final candidate shortlisting with deep AI-driven analytics.

### Key Highlights
- 🌓 **Dual Light & Dark Mode:** Curated theme palette with high-contrast data visualization, glassmorphism, and responsive CSS variables.
- 🎯 **Seamless Job Seeker Funnel:** Intuitive landing page without premature navigation links. Applicants scroll down, submit their resume, and progressively unlock consecutive evaluation rounds.
- 🎥 **Autonomous Round 3 AI Interview:** Webcam powers on automatically upon interview launch and powers down automatically after submitting the final question. Speech is transcribed and evaluated in real-time.
- 🏆 **Intelligent Shortlisting Engine:** Right/quality answers achieve scores above 80%. Candidates passing all three rounds (R1 &ge; 60%, R2 &ge; 70%, R3 &ge; 80%) are automatically **Shortlisted** with detailed dossier generation.
- 📊 **Executive Recruiter Console:** Styled after premier SaaS dashboards with collapsible dark sidebar, breadcrumbs, search shortcut (`⌘K`), 4 KPI metric cards, multi-stage filtering, and candidate dossiers.

---

## 🏛️ Architecture & System Design

```
                     ┌──────────────────────────────────────┐
                     │          React 18 Frontend           │
                     │          (Port 5173 - Vite)          │
                     └──────────────────┬───────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
┌─────────────────────────┐┌─────────────────────────┐┌─────────────────────────┐
│ Resume Screener Backend ││   Technical Quiz Engine ││ AI Voice Interview Svc  │
│  (FastAPI - Port 8000)  ││  (FastAPI - Port 8003)  ││  (FastAPI - Port 8004)  │
└────────────┬────────────┘└────────────┬────────────┘└────────────┬────────────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        ▼
                     ┌──────────────────────────────────────┐
                     │          Data Persistence            │
                     │   (applications.json Dossier DB)     │
                     └──────────────────────────────────────┘
```

---

## 🚀 How Each Round Works

### Round 1: ATS Resume Screening & Skill Matching
- **Objective:** Evaluate resume compatibility against job role specifications.
- **Workflow:**
  1. The candidate selects a target role (e.g. *Full Stack Developer*, *AI/ML Engineer*, *DevOps Specialist*) and uploads their resume (PDF or TXT).
  2. The backend extracts text using `pypdf`, matches candidate competencies against role taxonomies, and computes an ATS match score across 5 weighted dimensions:
     - **Skills Match** (Matched vs Missing skills)
     - **Experience Depth**
     - **Education Alignment**
     - **Project Relevance**
     - **Formatting & Readability**
  3. **Progression Criteria:** Candidates scoring **&ge; 60%** clear Round 1 and unlock the **Round 2 Technical Quiz**. Candidates below 60% are provided immediate constructive feedback.

---

### Round 2: Adaptive Technical Quiz & Problem-Solving
- **Objective:** Assess concrete engineering knowledge, algorithm design, and situational problem-solving.
- **Workflow:**
  1. The candidate launches Round 2 with their assigned Reference ID (`REF-XXXX`).
  2. The quiz engine generates role-specific technical questions spanning core architecture, algorithms, and real-world debugging scenarios.
  3. The candidate answers each multiple-choice or coding scenario with real-time feedback.
  4. Correct answers are kept secure on the server; sanitized question evaluations are streamed to the applicant.
  5. **Progression Criteria:** Candidates scoring **&ge; 70%** clear Round 2 and unlock the **Round 3 AI Voice & Video Interview**.

---

### Round 3: Autonomous AI Voice & Video Interview
- **Objective:** Evaluate verbal articulation, technical communication, engineering leadership, and STAR-format situational storytelling.
- **Camera Automation:**
  - **Auto-Enable:** When Round 3 starts, the candidate's webcam is automatically requested and displayed in a live circular/pip feed.
  - **Auto-Shutdown:** Immediately upon submitting the final question, all webcam video tracks are automatically stopped and released, ensuring complete privacy.
- **Speech-to-Text Pipeline:**
  - Employs browser Web Speech API with continuous streaming.
  - Resilient to pauses: automatically restarts recognition if silence triggers an early speech recognition `onend` event while the candidate is still speaking.
  - Real-time soundwave visualization displays active voice input.
- **Scoring & STAR Calibration:**
  - Evaluates answers across **Confidence** (1-10), **Evidence/STAR Framework** (1-10), **Clarity** (1-10), and **Professional Demeanor**.
  - Right, substantive answers reliably score **&ge; 80%** (typically 84% - 94%).

---

### 🎯 Multi-Round Aggregation & Shortlisting Logic

Candidates are evaluated against strict multi-stage thresholds:

| Round | Focus | Passing Threshold | Weight in Composite |
|---|---|---|---|
| **Round 1** | ATS Resume Screening | &ge; 60% | 40% |
| **Round 2** | Technical Quiz | &ge; 70% | 30% |
| **Round 3** | AI Voice & Video Interview | &ge; 80% | 30% |

$$\text{Composite Score} = (R_1 \times 0.40) + (R_2 \times 0.30) + (R_3 \times 0.30)$$

- **`SHORTLISTED`**: When a candidate clears **all 3 rounds** ($R_1 \ge 60\%$, $R_2 \ge 70\%$, $R_3 \ge 80\%$), the platform automatically updates their status to **`Shortlisted`** and assigns a recommendation of **`STRONGLY RECOMMENDED`**.
- **`ON HOLD`**: Candidates who cleared Round 1 & 2 but fell slightly below the 80% cutoff in Round 3.
- **`REJECTED`**: Candidates failing Round 1 or Round 2 thresholds.

---

## 💼 Recruiter Portal Features

1. **Enterprise Layout:** Left-hand navigation sidebar (Dashboard, Candidates, Interviews, Reports, Settings) matching premier SaaS platforms.
2. **Top Header:** Breadcrumbs (`Home > Candidates`), Global Search with `⌘K` keyboard shortcut, Notification bell, and Profile avatar.
3. **4 KPI Metric Cards:**
   - **Total Applications:** Complete pipeline candidate volume with month-over-month trend.
   - **Qualified (R1 & R2):** Candidates cleared through technical testing.
   - **Disqualified:** Applicants filtered out by automated thresholds.
   - **Shortlisted:** Top-tier talent that succeeded across all 3 rounds.
4. **Interactive Candidate Dossier:** Click **"View Dossier"** on any candidate to inspect:
   - Full 3-stage progress timeline
   - Matched vs Missing skill breakdown tags
   - Quiz score breakdown
   - AI interview transcript, STAR evidence breakdown, confidence metrics, and strengths/weaknesses.
   - One-click status updates (`Shortlisted`, `On Hold`, `Rejected`).

---

## 🛠️ How It Was Implemented

### Frontend (`resume-screener-react`)
- **Framework:** React 18 with Vite for lightning-fast HMR.
- **Routing:** `react-router-dom` v6 with clean, uncluttered navigation. Round 2 and Round 3 routes are dynamically accessible via funnel progression tokens rather than public navbar links.
- **Styling:** Pure Vanilla CSS using custom design tokens (`[data-theme='light']` and `[data-theme='dark']`). Glassmorphism, smooth micro-animations, and soundwave keyframe animations.
- **Icons:** `lucide-react` for crisp SVG icons.

### Backend Services
1. **Resume Screener & Gateway (`main.py` - Port 8000):**
   - Implemented in FastAPI.
   - Handles resume upload (`/analyze-resume`), job application persistence (`/apply`), and cross-service orchestration (`/start_round2`, `/round2/submit`, `/start_round3`, `/submit_round3_result`).
   - Manages recruiter authentication (`/recruiter/login`).
2. **Quiz Backend (`Quiz/main.py` - Port 8003):**
   - Dynamic question generator and submission evaluator.
3. **Interview Service (`analysis/main.py` - Port 8004):**
   - Natural language evaluation of behavioral responses against situational rubrics.

---

## ⚡ Quickstart Guide

### Prerequisites
- Python 3.10+ with virtual environment installed at `.venv`
- Node.js 18+ and `npm`

### 1. Launch All Services (One-Click)
In PowerShell from the repository folder:
```powershell
.\start_all.ps1
```
This launches:
- **Port 8000:** Resume Screener & Orchestrator API
- **Port 8003:** Technical Quiz Engine API
- **Port 8004:** AI Interview Service API
- **Port 5173:** React Frontend Application

### 2. Manual Startup (Individual Terminals)
If launching services individually:

**Resume Screener (Port 8000):**
```powershell
& "..\.venv\Scripts\python.exe" -m backend.main
```

**Technical Quiz (Port 8003):**
```powershell
$env:PORT="8003"; & "..\.venv\Scripts\python.exe" main.py
```

**AI Interview Engine (Port 8004):**
```powershell
$env:PORT="8004"; & "..\.venv\Scripts\python.exe" main.py
```

**Frontend (Port 5173):**
```bash
cd "resume screener/resume screener/resume-screener-react"
npm install
npm run dev
```

---

## 🔑 Demo Access & Testing Credentials

- **Job Seeker Portal:** `http://localhost:5173`
- **Recruiter Portal:** `http://localhost:5173/recruiter`
- **Recruiter Demo Email:** `recruiter@talentai.io`
- **Recruiter Password:** `recruiter123`
*(Or click the "Quick Demo Access (1-Click)" button on the login screen).*

---

## 📁 Repository Structure

```
New folder (3)/
├── README.md                      # Comprehensive project documentation
├── start_all.ps1                  # Single-command launcher for all 4 services
├── analysis/                      # AI Interview & evaluation engine (Port 8004)
├── Quiz/                          # Adaptive technical quiz backend (Port 8003)
└── resume screener/
    └── resume screener/
        ├── backend/               # Main ATS screener & orchestration API (Port 8000)
        │   ├── main.py            # API routes, scoring aggregation & recruiter auth
        │   └── data/
        │       └── applications.json  # Clean candidate dossier database
        └── resume-screener-react/ # Modern React SaaS frontend (Port 5173)
            ├── src/
            │   ├── App.jsx        # Navigation, theme state, clean routing
            │   ├── index.css      # Dark/Light CSS tokens & glassmorphic system
            │   ├── pages/
            │   │   ├── JobSeeker.jsx  # Hero landing page & ATS upload funnel
            │   │   ├── Round2.jsx     # Technical quiz assessment page
            │   │   ├── Round3.jsx     # AI voice/video interview with auto-cam
            │   │   └── Recruiter.jsx  # Modern Recruiter dashboard & dossier table
            │   └── components/    # Reusable cards, buttons & dossier modals
            └── package.json
```
