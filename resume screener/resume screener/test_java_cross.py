import requests
import os

def test_analyze():
    url = "http://localhost:8000/analyze"
    pdf_path = "resumes/FSDresume.pdf" # This one is known to work
    
    files = {
        'file': (os.path.basename(pdf_path), open(pdf_path, 'rb'), 'application/pdf')
    }
    data = {
        'role': 'JavaDeveloper'
    }
    
    try:
        print(f"Sending request to /analyze with {pdf_path} for role JavaDeveloper...")
        response = requests.post(url, data=data, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")
    finally:
        files['file'][1].close()

if __name__ == "__main__":
    test_analyze()
