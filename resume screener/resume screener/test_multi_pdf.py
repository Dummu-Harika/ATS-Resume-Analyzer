from pypdf import PdfReader
import io
import os

def test_file(pdf_path):
    print(f"\n--- Testing: {pdf_path} ---")
    if not os.path.exists(pdf_path):
        print("File not found")
        return
    with open(pdf_path, 'rb') as f:
        content = f.read()
    try:
        reader = PdfReader(io.BytesIO(content))
        print(f"Pages: {len(reader.pages)}")
        text = ""
        for i, page in enumerate(reader.pages):
            p_text = page.extract_text()
            print(f"Page {i} len: {len(p_text) if p_text else 0}")
            if p_text:
                text += p_text
        print(f"Total length: {len(text)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    files = [
        "resumes/Java-developer-Resume-Sample.pdf",
        "resumes/ethical hackerResume.pdf",
        "resumes/FSDresume.pdf",
        "resumes/Kalyan_Barri_Resume (1).pdf"
    ]
    for f in files:
        test_file(f)
