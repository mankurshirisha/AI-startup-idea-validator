"""End-to-end Chatbot Verification Test Suite.

Verifies the 9 required user questions against /api/chat/:
1. What is my startup validation score?
2. Explain the SWOT analysis.
3. Who are my competitors?
4. What pricing strategy should I use?
5. Is my startup idea scalable?
6. How can I improve this startup?
7. What are the biggest risks?
8. Explain TAM, SAM and SOM.
9. What business model would you recommend?
"""

import sys
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Sample Dashboard Validation Payload
SAMPLE_VALIDATION_RESULT = {
    "idea": "AI Resume & Interview Coach",
    "description": "An AI platform that analyzes resumes and conducts mock interviews.",
    "validationScore": 84,
    "status": "Strong",
    "verdict": "Promising market opportunity with high user interest",
    "executiveSummary": "AI Resume Coach targets job seekers with AI feedback and automated mock interviews.",
    "swot": {
        "strengths": ["Proprietary AI model", "Fast feedback loop", "Low operation cost"],
        "weaknesses": ["Brand awareness is low", "High reliance on LLM APIs"],
        "opportunities": ["B2B career center partnerships", "Global remote job boom"],
        "threats": ["Free generalist AI chatbots like ChatGPT"]
    },
    "competitors": [
        {"name": "Interviewing.io", "description": "Anonymous technical mock interviews with engineers.", "key_features": ["Live peer interviews"], "pricing": "$100/session"},
        {"name": "ResumeWorded", "description": "AI resume feedback platform.", "key_features": ["Resume scoring"], "pricing": "$19/mo"}
    ],
    "market": {
        "marketSize": "$12B Global EdTech / Career Coaching Market",
        "growthRate": "14.5% CAGR",
        "industry": "HRTech & Career Services",
        "trends": ["Remote work migration", "AI automated screening"],
        "tam": "$12 Billion",
        "sam": "$2.5 Billion",
        "som": "$300 Million"
    },
    "recommendations": [
        "Focus initial marketing on college career placement centers",
        "Introduce tiered monthly subscription pricing ($15/mo - $49/mo)",
        "Build chrome extension for one-click job application optimization"
    ]
}

TEST_QUESTIONS = [
    "What is my startup validation score?",
    "Explain the SWOT analysis.",
    "Who are my competitors?",
    "What pricing strategy should I use?",
    "Is my startup idea scalable?",
    "How can I improve this startup?",
    "What are the biggest risks?",
    "Explain TAM, SAM and SOM.",
    "What business model would you recommend?"
]

def run_e2e_suite():
    print("======================================================================")
    print("       STARTING BETA BUDDY END-TO-END CHATBOT PIPELINE TEST SUITE")
    print("======================================================================\n")

    # Step 1: Create session
    create_res = client.post("/api/chat/session", json={"dashboard_id": "dash_e2e_test_100"})
    assert create_res.status_code == 200, f"Session creation failed: {create_res.text}"
    session_id = create_res.json()["session_id"]
    print(f"[OK] Created test session: {session_id}")

    # Step 2: Run all 9 required test questions sequentially
    passed_count = 0

    for i, question in enumerate(TEST_QUESTIONS, 1):
        print(f"\n[{i}/9] Testing Question: '{question}'")
        
        req_payload = {
            "session_id": session_id,
            "dashboard_id": "dash_e2e_test_100",
            "question": question,
            "validation_result": SAMPLE_VALIDATION_RESULT
        }

        res = client.post("/api/chat/", json=req_payload)
        
        assert res.status_code == 200, f"HTTP request failed with status {res.status_code}: {res.text}"
        data = res.json()

        # Verify all 6 required fields in API response schema (Requirement 7)
        for field in ("status", "response", "intent", "latency_ms", "conversation_length", "request_id"):
            assert field in data, f"Missing required response field '{field}' in: {data}"

        assert data["status"] in ("success", "clarification_required"), f"Unexpected status: {data['status']}"
        assert data["response"] is not None and len(data["response"]) > 10, f"Empty or invalid response string: {data['response']}"
        assert data["latency_ms"] > 0, "Latency ms must be positive"
        assert data["conversation_length"] > 0, "Conversation length must be positive"

        print(f"     Status: {data['status']} | Intent: {data['intent']} | Latency: {data['latency_ms']:.2f} ms")
        print(f"     Response snippet: {data['response'][:100].strip()}...")
        passed_count += 1

    print("\n======================================================================")
    print(f" SUCCESS: All {passed_count}/{len(TEST_QUESTIONS)} required questions passed end-to-end tests!")
    print("======================================================================\n")

if __name__ == "__main__":
    run_e2e_suite()
