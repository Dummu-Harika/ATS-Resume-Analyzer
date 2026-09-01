import requests

def test_web_upload():
    url = "http://localhost:8000/analyze"
    role = "JavaFullStackDeveloper"
    print(f"--- First Upload ---")
    with open("java_resume.txt", "rb") as f:
        files = {'file': ('java_resume.txt', f, 'text/plain')}
        data = {'role': role}
        response = requests.post(url, data=data, files=files)
        print(f"Status 1: {response.status_code}")
        
    print(f"--- Second Upload (Overwrite) ---")
    with open("java_resume.txt", "rb") as f:
        files = {'file': ('java_resume.txt', f, 'text/plain')}
        data = {'role': role}
        response = requests.post(url, data=data, files=files)
        print(f"Status 2: {response.status_code}")
        try:
            print("Response 2:", response.json().get('resume_url'))
        except:
            print("Response 2 Text:", response.text)

if __name__ == "__main__":
    test_web_upload()
