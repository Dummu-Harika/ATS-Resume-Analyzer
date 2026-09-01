import asyncio
from backend.utils.ai_analyzer import GeminiAnalyzer

async def test():
    api_key = os.environ.get('GEMINI_API_KEY')
    analyzer = GeminiAnalyzer(api_key)
    result = await analyzer.analyze_resume_semantically("Sample resume text", "Software Engineer", "resume.pdf")
    print(result)

if __name__ == "__main__":
    asyncio.run(test())
