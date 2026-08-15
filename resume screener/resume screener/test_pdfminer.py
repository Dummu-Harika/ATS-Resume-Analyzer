from pdfminer.high_level import extract_text
import os

pdf_path = "resumes/Java-developer-Resume-Sample.pdf"
if os.path.exists(pdf_path):
    try:
        text = extract_text(pdf_path)
        print(f"Extracted length: {len(text)}")
        print(f"Preview: {text[:100]}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("File not found")
