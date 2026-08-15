import os
from supabase import create_client, Client

SUPABASE_URL = "https://dqtimixizpegafznagfi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdGltaXhpenBlZ2Fmem5hZ2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyNjExMSwiZXhwIjoyMDgxODAyMTExfQ.OhU_7KsYvH0b__S0i9EC62ctdGACcbZgOXvRP5vbnKY"

def test_upload():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        bucket_name = "resumes"
        file_path = "test_connection.txt"
        file_content = b"Supabase connection test"
        
        print(f"Attempting to upload to bucket: {bucket_name}...")
        
        # Try to list buckets first to check connection/auth
        try:
            buckets = supabase.storage.list_buckets()
            print(f"Available buckets: {[b.name for b in buckets]}")
        except Exception as list_err:
            print(f"Could not list buckets: {list_err}")

        # Attempt upload
        response = supabase.storage.from_(bucket_name).upload(
            file_path,
            file_content,
            {"content-type": "text/plain", "upsert": "true"}
        )
        print(f"Upload response: {response}")
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        print(f"Public URL: {public_url}")
        
    except Exception as e:
        print(f"FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_upload()
