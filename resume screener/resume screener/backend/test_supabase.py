from supabase import create_client, Client
import os

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    buckets = supabase.storage.list_buckets()
    print(f"Buckets: {[b.name for b in buckets]}")
    
    bucket_name = "resumes"
    file_path = "test_test.txt"
    content = b"This is a test file"
    
    print(f"Attempting to upload to {bucket_name}/{file_path}...")
    # Trying with upsert as string "true"
    res = supabase.storage.from_(bucket_name).upload(
        file_path, 
        content,
        {"content-type": "text/plain", "x-upsert": "true"}
    )
    print(f"Upload Result: {res}")
    
    url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    print(f"Public URL: {url}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"ERROR: {str(e)}")
