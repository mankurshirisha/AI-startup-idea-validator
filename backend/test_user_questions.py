"""Specific Chat Request Verification Test.

Tests the exact queries requested by the user:
- "Recommend a pricing model"
- "Who are my competitors?"
- "What is the target market?"
- "Is my startup idea viable?"
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_DASHBOARD = {
    "idea": "AI Startup Validator",
    "description": "Automated startup validation platform with AI analysis",
    "validationScore": 85,
    "status": "Promising",
    "verdict": "High market potential in B2B SaaS space",
    "executiveSummary": "AI Startup Validator helps founders validate business ideas fast.",
    "competitors": [
        {"name": "Validately", "description": "User research and validation", "pricing": "$49/mo"},
        {"name": "ValidationBoard", "description": "Manual lean startup validation tool", "pricing": "$29/mo"}
    ],
    "market": {
        "marketSize": "$5.2B Global Startup Tooling Market",
        "growthRate": "16.2% CAGR",
        "industry": "Developer & Founder Tools",
        "target_market": "Early stage founders, incubators, accelerators"
    },
    "recommendations": [
        "Use usage-based subscription pricing",
        "Target startup accelerators first"
    ]
}

TARGET_QUESTIONS = [
    "Recommend a pricing model",
    "Who are my competitors?",
    "What is the target market?",
    "Is my startup idea viable?"
]

def run_test():
    print("======================================================================")
    print("       TESTING USER SPECIFIED CHAT REQUESTS")
    print("======================================================================\n")

    create_res = client.post("/api/chat/session", json={"dashboard_id": "dash_user_test_200"})
    assert create_res.status_code == 200, f"Session creation failed: {create_res.text}"
    session_id = create_res.json()["session_id"]
    print(f"[OK] Created test session: {session_id}\n")

    for q in TARGET_QUESTIONS:
        print(f"Testing Question: '{q}'")
        payload = {
            "session_id": session_id,
            "dashboard_id": "dash_user_test_200",
            "question": q,
            "validation_result": SAMPLE_DASHBOARD
        }
        res = client.post("/api/chat/", json=payload)
        assert res.status_code == 200, f"API error: {res.text}"
        data = res.json()
        assert data["status"] == "success", f"Unexpected status: {data['status']}"
        assert "BetaBuddy is temporarily experiencing high demand" not in data["response"], "Received fallback message instead of actual answer!"
        print(f"   [SUCCESS] Status: {data['status']} | Intent: {data['intent']}")
        print(f"   [RESPONSE SNIPPET]:\n   {data['response'][:250].strip()}...\n")
        print("-" * 70)

    print("\nALL USER SPECIFIED CHAT REQUESTS PASSED WITH ACTUAL RESPONSES!")

if __name__ == "__main__":
    run_test()
