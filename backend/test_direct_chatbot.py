"""Minimal direct test verifying BetaBuddy Chatbot advisor response style.

Tests the target questions:
- "Recommend a pricing model"
- "Who are my competitors?"
- "What is the target market?"
- "Is my startup idea viable?"
"""

import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_STREETBYTE_DASHBOARD = {
    "startupIdea": "StreetByte",
    "description": "Hyperlocal street food discovery app connecting foodies with verified street vendors.",
    "industry": "FoodTech & Local Commerce",
    "validationScore": 82,
    "status": "Promising",
    "verdict": "High growth potential in urban food tech space",
    "executiveSummary": "StreetByte is a hyperlocal food discovery app connecting urban food lovers with verified street food vendors.",
    "competitors": [
        {"name": "Zomato", "description": "Food delivery and restaurant discovery", "pricing": "Commission-based"},
        {"name": "Swiggy", "description": "Hyperlocal delivery platform", "pricing": "Delivery fee & commission"},
        {"name": "Magicpin", "description": "Local savings and discovery app", "pricing": "Merchant listing fee"}
    ],
    "market": {
        "market_size": "Rs. 44,000 Crore Indian Street Food Market",
        "growth_rate": "14.5% CAGR",
        "industry": "FoodTech",
        "target_market": "Urban foodies, street food vendors, college students"
    },
    "recommendations": [
        "Adopt a freemium listing model for vendors with premium features for promoted placement.",
        "Partner with local municipal food hygiene authorities for vendor verification badges.",
        "Launch hyper-targeted social media campaigns around popular street food hubs."
    ]
}

TARGET_QUESTIONS = [
    "Recommend a pricing model",
    "Who are my competitors?",
    "What is the target market?",
    "Is my startup idea viable?"
]

UNWANTED_PATTERNS = [
    "### Key Insights",
    "### Recommendations",
    "### Next Step",
    "Great question",
    "Based on my analysis",
    "Absolutely!",
    "BetaBuddy is temporarily experiencing high demand"
]

def test_direct_chatbot():
    print("======================================================================")
    print("       VERIFYING CHIEF STARTUP ADVISOR CHATBOT RESPONSE STYLE")
    print("======================================================================\n")

    # 1. Test /api/betabuddy/chat endpoint (Frontend Widget route)
    print("--- 1. Testing Frontend Widget Endpoint (/api/betabuddy/chat) ---")
    session_id = "test_session_advisor_100"

    for q in TARGET_QUESTIONS:
        print(f"\n[QUERY]: '{q}'")
        payload = {
            "sessionId": session_id,
            "question": q,
            "validationResult": SAMPLE_STREETBYTE_DASHBOARD
        }
        res = client.post("/api/betabuddy/chat", json=payload)
        assert res.status_code == 200, f"API error {res.status_code}: {res.text}"
        data = res.json()
        assert data["status"] == "success", f"Unexpected status: {data['status']}"
        answer = data.get("answer", "")

        words = len(answer.split())
        print(f"[STATUS]: {data['status']} | [INTENT]: {data.get('intent')}")
        print(f"[WORD COUNT]: {words} words | [CHAR COUNT]: {len(answer)} chars")
        
        # Verify style bounds
        assert len(answer) > 20, "Answer too short!"
        for pattern in UNWANTED_PATTERNS:
            assert pattern.lower() not in answer.lower(), f"Found unwanted pattern '{pattern}' in answer!"
        
        print(f"[ANSWER FULL TEXT]:\n{answer}\n")

    # 2. Test /api/chat/ endpoint (Standard API route)
    print("--- 2. Testing Standard Chat Endpoint (/api/chat/) ---")
    create_res = client.post("/api/chat/session", json={"dashboard_id": "dash_advisor_200"})
    assert create_res.status_code == 200
    chat_session_id = create_res.json()["session_id"]

    for q in TARGET_QUESTIONS:
        print(f"\n[QUERY]: '{q}'")
        payload = {
            "session_id": chat_session_id,
            "dashboard_id": "dash_advisor_200",
            "question": q,
            "validation_result": SAMPLE_STREETBYTE_DASHBOARD
        }
        res = client.post("/api/chat/", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        response = data.get("response", "")

        words = len(response.split())
        print(f"[STATUS]: {data['status']} | [INTENT]: {data.get('intent')}")
        print(f"[WORD COUNT]: {words} words | [CHAR COUNT]: {len(response)} chars")

        # Verify style bounds
        assert len(response) > 20, "Response too short!"
        for pattern in UNWANTED_PATTERNS:
            assert pattern.lower() not in response.lower(), f"Found unwanted pattern '{pattern}' in response!"

        print(f"[RESPONSE FULL TEXT]:\n{response}\n")

    print("======================================================================")
    print("   ALL CHIEF STARTUP ADVISOR CHATBOT STYLE TESTS PASSED SUCCESSFULLY!")
    print("======================================================================\n")

if __name__ == "__main__":
    test_direct_chatbot()
