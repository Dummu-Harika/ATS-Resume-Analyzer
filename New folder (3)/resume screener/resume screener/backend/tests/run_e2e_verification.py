import os, sys, pathlib, time, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
import requests

API = os.environ.get('VITE_API_URL', 'http://127.0.0.1:8002')
QUIZ = os.environ.get('QUIZ_API_URL', 'http://127.0.0.1:8003')
INTERVIEW = os.environ.get('INTERVIEW_API_URL', 'http://127.0.0.1:8004')

print('Using API:', API)

# 1. Round 1: analyze
files = {'file': ('sample_resume.txt', b"John Doe\nSoftware Engineer\nSkills: Python, SQL, React\nExperience: 3 years", 'text/plain')}
data = {'role': 'FullStackDeveloper'}
print('Calling /analyze...')
r = requests.post(f"{API}/analyze", files=files, data=data, timeout=20)
print('analyze status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(2)
res = r.json()
print('analyze result keys:', list(res.keys()))

# 2. Apply
application = {
    'name': 'E2E Candidate',
    'email': 'e2e@example.com',
    'role': 'FullStackDeveloper',
    'resume_text': res.get('analysis', {}).get('final_report') or res.get('text_preview'),
    'analysis': res.get('analysis')
}
print('Calling /apply...')
r = requests.post(f"{API}/apply", json=application, timeout=20)
print('apply status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(3)
app = r.json()
print('Application created:', app.get('id'))
candidate_id = app.get('id')

# 3. Start Round2
print('Starting round2 via /start_round2')
r = requests.post(f"{API}/start_round2", json={'id': candidate_id}, timeout=20)
print('start_round2 status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(4)
data = r.json(); session_id = data.get('session_id'); print('session_id', session_id)

# 4. Loop submit answers until report
next_q = data.get('question')
while True:
    payload = {'session_id': session_id, 'answer': 'my answer'}
    r = requests.post(f"{API}/round2/submit", json=payload, timeout=20)
    if r.status_code != 200:
        print('round2 submit error', r.status_code, r.text); sys.exit(5)
    j = r.json()
    if 'report' in j and j.get('report'):
        print('Round2 finished, report present')
        break
    if j.get('next_question') is None:
        print('No next question but no report?'); break
    # continue loop
print('Round2 done')

# 5. Start Round3
print('Starting round3')
r = requests.post(f"{API}/start_round3", json={'id': candidate_id}, timeout=20)
print('start_round3 status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(6)
j = r.json(); session_id = j.get('session_id'); print('interview session id', session_id)

# 6. Generate questions on interview service
print('Generating interview questions')
r = requests.post(f"{INTERVIEW}/api/interview/generate-questions/{session_id}", timeout=20)
print('generate status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(7)
qs = r.json(); print('questions count', len(qs))

# 7. Submit answers for each question
for q in qs:
    qid = q.get('id')
    body = {'question_id': qid, 'transcribed_text': 'This is my answer', 'duration_seconds': 12}
    r = requests.post(f"{INTERVIEW}/api/interview/submit-answer/{session_id}", json=body, timeout=20)
    if r.status_code != 200:
        print('submit answer error', r.status_code, r.text); sys.exit(8)
    print('submitted question', qid)

# 8. Fetch final interview assessment
r = requests.get(f"{INTERVIEW}/api/interview/final-score/{session_id}", timeout=20)
print('final-score status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(9)
final = r.json(); print('interview final overall_score', final.get('overall_score'))

# 9. Run aggregator endpoint
print('Calling aggregator endpoint')
r = requests.post(f"{API}/aggregate_final/{candidate_id}", timeout=20)
print('aggregate status', r.status_code)
if r.status_code != 200:
    print(r.text); sys.exit(10)
agg = r.json(); print('aggregation result:', agg)

# 10. Run aggregator again to verify idempotency
r2 = requests.post(f"{API}/aggregate_final/{candidate_id}", timeout=20)
print('aggregate repeat status', r2.status_code)
if r2.status_code != 200:
    print(r2.text); sys.exit(11)
print('Repeat aggregation result OK')

print('\nE2E verification completed successfully')
exit(0)
