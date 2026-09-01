import httpx
import os
import json

async def test_rest():
    api_key = os.environ.get('GEMINI_API_KEY')
    url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + api_key
    
    payload = {
        "contents": [{
            "parts": [{"text": "Hello, return JSON: {'status': 'ok'}"}]
        }]
    }
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.post(url, json=payload)
            print(response.status_code)
            print(response.text)
        except Exception as e:
            print(f"REST Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_rest())
