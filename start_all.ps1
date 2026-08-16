# start_all.ps1
# Starts Resume Screener, Quiz and Interview backends for local development on Windows.
# DOES NOT include secrets. Set environment variables in a .env file or in the console before running.

# Adjust these paths if your repository is in a different location
$root = "C:\Users\harik\OneDrive\c++\Desktop\ATS Resume Analyzer\New folder (3)"
$resumeBackend = Join-Path $root "resume screener\resume screener"
$quizBackend = Join-Path $root "Quiz\Quiz\backend"
$interviewBackend = Join-Path $root "analysis\analysis\backend"

Write-Host "Starting services..."

# Resume Screener: python -m backend.main (default PORT=8000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$resumeBackend'; $env:PORT='8000'; $env:INTERVIEW_API_URL='http://localhost:8004'; Write-Host 'Starting Resume Screener (python -m backend.main) on port 8000'; python -m backend.main"

# Quiz backend (default port 8003)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$quizBackend'; $env:QUIZ_PORT='8003'; $env:PORT='8003'; Write-Host 'Starting Quiz backend (python main.py) on port 8003'; python main.py"

# Interview backend (default port 8004)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$interviewBackend'; $env:INTERVIEW_PORT='8004'; $env:INTERVIEW_API_URL='http://localhost:8004'; Write-Host 'Starting Interview backend (python main.py) on port 8004'; python main.py"

Write-Host "Launched start windows for services. Check the three new PowerShell windows for logs."
Write-Host "Recommended: open a browser and visit: http://127.0.0.1:8000/docs, http://127.0.0.1:8003/docs, http://127.0.0.1:8002/docs"