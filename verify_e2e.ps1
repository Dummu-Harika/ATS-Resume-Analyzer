# verify_e2e.ps1
# Performs an automated E2E verification of core endpoints for the ATS Resume Analyzer.
# Requires the backends to be running: Resume Screener (8000), Quiz (8003), Interview (8002)

function Check-JsonField($resp, $field){
    return ($resp -ne $null) -and ($resp.$field -ne $null)
}

$base = 'http://127.0.0.1:8000'
# Allow overriding interview API URL via environment; default to canonical 8004
$interview = $env:INTERVIEW_API_URL
if (-not $interview -or $interview -eq '') { $interview = 'http://127.0.0.1:8004' }
$quiz = 'http://127.0.0.1:8003'

Write-Host "Verifying health endpoints..."
try{
    $r = Invoke-RestMethod -Uri "$base/" -Method Get -TimeoutSec 5
    Write-Host "/ ->" $r.status
}catch{ Write-Host "Resume Screener root failed: $_"; exit 1 }

try{ $r = Invoke-RestMethod -Uri "$interview/" -Method Get -TimeoutSec 5; Write-Host "Interview ->" $r.message }catch{ Write-Host "Interview root failed: $_"; exit 1 }
try{ $r = Invoke-RestMethod -Uri "$quiz/health" -Method Get -TimeoutSec 5; Write-Host "Quiz ->" $r.status }catch{ Write-Host "Quiz health failed: $_"; exit 1 }

Write-Host "Creating a sample application via /apply..."
$analysis = @{ parameter_scores=@{skills=50; experience=30; education=60; projects=40; ats=100}; final_score=50; overallScore=50 }
$body = @{ name='E2E Tester'; email='e2e@example.com'; role='DataScienceEngineer'; analysis=$analysis }
try{
    $create = Invoke-RestMethod -Uri "$base/apply" -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 10
    Write-Host "Apply returned id:" $create.id
}catch{ Write-Host "Apply failed:" $_; exit 1 }

$candidateId = $create.id

Write-Host "Starting Round 2 for $candidateId..."
try{
    $sr2 = Invoke-RestMethod -Uri "$base/start_round2" -Method Post -ContentType 'application/json' -Body (@{ id=$candidateId } | ConvertTo-Json)
    Write-Host "Round2 session:" $sr2.session_id
}catch{ Write-Host "start_round2 failed:" $_; exit 1 }

# Submit a dummy answer
try{
    $sub = Invoke-RestMethod -Uri "$base/round2/submit" -Method Post -ContentType 'application/json' -Body (@{ session_id=$sr2.session_id; answer='A' } | ConvertTo-Json)
    Write-Host "Round2 submit ok"
}catch{ Write-Host "round2 submit failed:" $_; exit 1 }

# Ensure candidate has quiz_score (or set one)
try{
    Invoke-RestMethod -Uri "$base/update_quiz_score" -Method Post -ContentType 'application/json' -Body (@{ id=$candidateId; quiz_score=85 } | ConvertTo-Json)
    Write-Host "Quiz score updated to 85"
}catch{ Write-Host "update_quiz_score failed: $_"; exit 1 }

Write-Host "Starting Round 3..."
try{
    $sr3 = Invoke-RestMethod -Uri "$base/start_round3" -Method Post -ContentType 'application/json' -Body (@{ id=$candidateId } | ConvertTo-Json) -TimeoutSec 20
    Write-Host "Round3 session id:" $sr3.session_id
}catch{ Write-Host "start_round3 failed:" $_; exit 1 }

$session = $sr3.session_id
Write-Host "Generate questions..."
try{ $gq = Invoke-RestMethod -Uri "$interview/api/interview/generate-questions/$session" -Method Post -ContentType 'application/json' -Body '{}' -TimeoutSec 10; Write-Host "Questions count:" $gq.Count }catch{ Write-Host "generate-questions failed:" $_; exit 1 }

Write-Host "Submit sample answers for first 3 questions (if available)..."
try{
    $i=1
    foreach($q in $gq){
        if($i -gt 3){ break }
        Invoke-RestMethod -Uri "$interview/api/interview/submit-answer/$session" -Method Post -ContentType 'application/json' -Body (@{ question_id=$q.question_number; transcribed_text='Sample answer' } | ConvertTo-Json)
        Write-Host "Submitted answer for question" $q.question_number
        $i++
    }
}catch{ Write-Host "submit-answer failed:" $_; exit 1 }

Write-Host "Fetching final interview score..."
try{
    $fs = Invoke-RestMethod -Uri "$interview/api/interview/final-score/$session" -Method Get -TimeoutSec 10
    Write-Host "Final overall_score:" $fs.overall_score
}catch{ Write-Host "final-score failed:" $_; exit 1 }

Write-Host "Triggering aggregation by interview session..."
try{
    $agg = Invoke-RestMethod -Uri "$base/aggregate_by_interview/$session" -Method Post -TimeoutSec 10
    Write-Host "Aggregation result: final_score=" $agg.final_score " recommendation=" $agg.recommendation
}catch{ Write-Host "aggregation failed:" $_; exit 1 }

Write-Host "E2E verification completed successfully."
exit 0
