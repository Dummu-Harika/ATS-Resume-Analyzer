import manager
import json
import time

def test_quiz_flow():
    print("--- Starting Quiz Flow Test ---")
    
    # 1. Create Session
    print("\n[Step 1] Creating Session for 'Python'...")
    start_time = time.time()
    try:
        session = manager.create_session("Python")
    except Exception as e:
        print(f"FAILED to create session: {e}")
        return

    duration = time.time() - start_time
    print(f"Session created in {duration:.2f} seconds.")
    print(f"Session ID: {session.session_id}")
    
    # Check questions
    questions = session.public_questions
    print(f"Number of questions generated: {len(questions)}")
    
    if len(questions) != 20:
        print("WARNING: Expected 20 questions.")
    
    # Inspect first question structure
    if questions:
        print("\nFirst Question Sample:")
        print(json.dumps(questions[0], indent=2))
        
    # 2. Submit Answers
    print("\n[Step 2] Submitting Answers...")
    
    # Generate dummy answers
    user_answers = {}
    for q in questions:
        q_id = str(q.get("id"))
        if q.get("type") == "mcq":
            user_answers[q_id] = q.get("options", ["A"])[0] # Pick first option
        else:
            user_answers[q_id] = "Sample mock answer"
            
    # Submit
    print(f"Submitting {len(user_answers)} answers...")
    start_time = time.time()
    try:
        report = session.grade(user_answers)
    except Exception as e:
         print(f"FAILED to grade quiz: {e}")
         return
         
    duration = time.time() - start_time
    print(f"Grading completed in {duration:.2f} seconds.")
    
    # 3. Inspect Report
    print("\n[Step 3] Evaluation Report:")
    print(json.dumps(report, indent=2))
    
    # Basic Validations
    if "totalScore" in report and "results" in report:
        print("\nSUCCESS: Report structure looks valid.")
        if report.get("isSelected"):
            print("\n>>> RESULT: CONGRATULATIONS! YOU HAVE BEEN SELECTED. <<<")
        else:
            print("\n>>> RESULT: SORRY, YOU HAVE NOT BEEN SELECTED. <<<")
    else:
        print("\nFAILURE: Report structure is missing key fields.")

if __name__ == "__main__":
    test_quiz_flow()
