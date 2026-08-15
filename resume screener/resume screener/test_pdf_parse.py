from pypdf import PdfReader
import io
import os

def parse_resume(file_bytes: bytes, filename: str) -> str:
    text = ""
    try:
        if filename.lower().endswith('.pdf'):
            reader = PdfReader(io.BytesIO(file_bytes))
            print(f"DEBUG: Pages in PDF: {len(reader.pages)}")
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                print(f"DEBUG: Page {i} text length: {len(page_text) if page_text else 0}")
                if page_text:
                    text += page_text + "\n"
        else:
            text = file_bytes.decode('utf-8', errors='ignore')
        return text.strip()
    except Exception as e:
        print(f"Error parsing file: {e}")
        return ""

if __name__ == "__main__":
    pdf_path = "resumes/Java-developer-Resume-Sample.pdf"
    if os.path.exists(pdf_path):
        with open(pdf_path, 'rb') as f:
            content = f.read()
        extracted = parse_resume(content, pdf_path)
        print(f"Final extracted length: {len(extracted)}")
    else:
        print("File not found")
