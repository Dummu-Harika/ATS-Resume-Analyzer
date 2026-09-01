from pypdf import PdfReader
import io
import os
from pdfminer.high_level import extract_text as pdfminer_extract

def parse_resume(file_bytes: bytes, filename: str) -> str:
    """
    Extracts text from a resume file (PDF or TXT).
    """
    text = ""
    try:
        if filename.lower().endswith('.pdf'):
            # Primary: Extract from PDF using pypdf (faster)
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    p_text = page.extract_text()
                    if p_text:
                        text += p_text + "\n"
            except Exception as e:
                print(f"pypdf failed for {filename}: {e}")

            # Fallback: If pypdf extracted nothing, try pdfminer.six (more robust for complex layouts)
            if not text.strip():
                print(f"DEBUG: pypdf extracted nothing for {filename}. Trying pdfminer fallback...")
                try:
                    text = pdfminer_extract(io.BytesIO(file_bytes))
                    if text:
                        print(f"DEBUG: pdfminer successfully extracted {len(text)} characters")
                except Exception as e:
                    print(f"pdfminer also failed for {filename}: {e}")
        else:
            # Assume text/plain
            text = file_bytes.decode('utf-8', errors='ignore')
            
        final_text = text.strip()
        return final_text
    except Exception as e:
        print(f"CRITICAL ERROR parsing file '{filename}': {e}")
        return ""
