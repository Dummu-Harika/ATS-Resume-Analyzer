# start_all.ps1
# Starts Resume Screener, Quiz, Interview backends, and React Frontend for local development on Windows.

$root = Join-Path $PSScriptRoot "New folder (3)"
$resumeBackend = Join-Path $root "resume screener\resume screener"
$quizBackend = Join-Path $root "Quiz\Quiz\backend"
$interviewBackend = Join-Path $root "analysis\analysis\backend"
$frontend = Join-Path $root "resume screener\resume screener\resume-screener-react"

# Locate virtual environment python if present
$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    $venvPython = "python"
}

Write-Host "=================================================="
Write-Host "  TalentAI Enterprise Platform - Starting Services"
Write-Host "  Python: $venvPython"
Write-Host "=================================================="

# 1. Resume Screener: python -m backend.main (Port 8000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$resumeBackend'; $env:PORT='8000'; $env:INTERVIEW_API_URL='http://localhost:8004'; Write-Host 'Starting Resume Screener on port 8000'; & '$venvPython' -m backend.main"

# 2. Quiz backend (Port 8003)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$quizBackend'; $env:QUIZ_PORT='8003'; $env:PORT='8003'; Write-Host 'Starting Quiz backend on port 8003'; & '$venvPython' main.py"

# 3. Interview backend (Port 8004)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$interviewBackend'; $env:INTERVIEW_PORT='8004'; $env:INTERVIEW_API_URL='http://localhost:8004'; Write-Host 'Starting Interview backend on port 8004'; & '$venvPython' main.py"

# 4. React SaaS Frontend (Port 5173)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; Write-Host 'Starting TalentAI SaaS Frontend on port 5173'; npm run dev"

Write-Host "Launched all 4 services in dedicated PowerShell windows."
Write-Host "Platform URL: http://localhost:5173"
Write-Host "Swagger Docs: http://127.0.0.1:8000/docs | http://127.0.0.1:8003/docs | http://127.0.0.1:8004/docs"