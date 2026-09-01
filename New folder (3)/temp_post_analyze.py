import requests
url='http://127.0.0.1:8000/analyze'
files={'file':('sample_resume.txt', open(r'C:\Users\harik\OneDrive\c++\Desktop\ATS Resume Analyzer\New folder (3)\sample_resume.txt','rb'))}
data={'role':'DataScienceEngineer'}
resp = requests.post(url, files=files, data=data, timeout=20)
print(resp.status_code)
print(resp.text)
