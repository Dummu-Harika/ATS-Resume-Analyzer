import requests
try:
    resp = requests.post('http://127.0.0.1:8000/start_round2', json={'id':'REF-1045'}, timeout=20)
    print(resp.status_code)
    print(resp.text)
except Exception as e:
    print('ERROR', e)
