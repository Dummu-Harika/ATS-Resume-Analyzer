from supabase import create_client, Client
import os
import sys

# Add the project root to sys.path to allow imports from backend
sys.path.append(r"c:\Users\santh\OneDrive\Documents\resume screener")

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_upload():
    try:
        bucket_name = "resumes"
        file_path = "test_verification.txt"
        file_data = b"Verification test content"
        
        print(f"DEBUG: Attempting upload to {bucket_name}/{file_path}")
        
        # Exact same call as in main.py
        response = supabase.storage.from_(bucket_name).upload(
            file_path, 
            file_data,
            {"content-type": "text/plain", "x-upsert": "true"}
        )
        print(f"DEBUG: Upload response: {response}")
        
        resume_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        print(f"DEBUG: Generated URL: {resume_url}")
        
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in upload: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    test_upload()
