import requests
import os

def test_analyze():
    url = "http://localhost:8000/analyze"
    pdf_path = "resumes/FSDresume.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return

    files = {
        'file': (os.path.basename(pdf_path), open(pdf_path, 'rb'), 'application/pdf')
    }
    data = {
        'role': 'FullStackDeveloper'
    }
    
    try:
        print(f"Sending request to /analyze with {pdf_path}...")
        response = requests.post(url, data=data, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")
    finally:
        files['file'][1].close()

if __name__ == "__main__":
    test_analyze()
