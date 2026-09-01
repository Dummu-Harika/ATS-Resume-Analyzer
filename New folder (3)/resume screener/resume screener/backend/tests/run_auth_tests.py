import os, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
import requests

API = os.environ.get('VITE_API_URL', 'http://127.0.0.1:8010')

# Read secrets from environment for tests
RECRUITER_KEY = os.environ.get('RECRUITER_API_KEY', '')
AGG_SECRET = os.environ.get('AGGREGATOR_WEBHOOK_SECRET', '')

print('Using API:', API)

# 1. Unauthenticated access to /candidates should be denied (401) unless in development without key
r = requests.get(f"{API}/candidates")
print('/candidates status (no key):', r.status_code)

# 2. Access with invalid key
headers = {'X-API-KEY': 'badkey'}
r2 = requests.get(f"{API}/candidates", headers=headers)
print('/candidates status (bad key):', r2.status_code)

# 3. Access with valid key (if configured)
if RECRUITER_KEY:
    headers = {'X-API-KEY': RECRUITER_KEY}
    r3 = requests.get(f"{API}/candidates", headers=headers)
    print('/candidates status (valid key):', r3.status_code)
else:
    print('RECRUITER_API_KEY not set; manual check needed for recruiter endpoint auth')

# 4. Aggregator webhook without secret
r4 = requests.post(f"{API}/aggregate_by_interview/6")
print('/aggregate_by_interview (no secret):', r4.status_code)

# 5. Aggregator webhook with invalid secret
r5 = requests.post(f"{API}/aggregate_by_interview/6", headers={'X-AGGREGATOR-SECRET': 'bad'})
print('/aggregate_by_interview (bad secret):', r5.status_code)

# 6. With valid secret (if configured)
if AGG_SECRET:
    r6 = requests.post(f"{API}/aggregate_by_interview/6", headers={'X-AGGREGATOR-SECRET': AGG_SECRET})
    print('/aggregate_by_interview (valid secret):', r6.status_code, r6.text[:200])
else:
    print('AGGREGATOR_WEBHOOK_SECRET not set; manual check needed for aggregator webhook')
