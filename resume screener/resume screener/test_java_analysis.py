import asyncio
from backend.utils.analyzer import DepthAnalyzer
import os

async def test_java_analysis():
    # Use the same API key as in main.py
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    analyzer = DepthAnalyzer(ai_api_key=GEMINI_API_KEY)
    
    test_text = """
    John Doe
    Java Developer with 5 years experience.
    Strong in Core Java, Spring Boot, Hibernate, SQL.
    Projects: E-commerce backend in Java.
    Education: B.Tech in CSE.
    """
    
    role = "JavaDeveloper"
    filename = "test_resume.pdf"
    
    print(f"Starting analysis for role: {role}...")
    try:
        result = await analyzer.analyze(test_text, role, filename)
        print("Analysis Successful!")
        print(f"Score: {result.get('final_score') or result.get('overallScore')}")
        print(f"Decision: {result.get('decision')}")
    except Exception as e:
        print(f"Analysis FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_java_analysis())
