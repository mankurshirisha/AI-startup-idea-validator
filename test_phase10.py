import time
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.chatbot import (
    BetaBuddyService,
    ChatService,
    LLMResponse,
)
from app.chatbot.router import get_beta_service, get_chat_service
from app.main import app

# Setup Mocks
mock_llm = MagicMock()
mock_llm.generate.return_value = LLMResponse(
    response_text="### Answer\nYour SWOT analysis shows strong competitive positioning.",
    latency_ms=120.0,
)

real_beta_service = BetaBuddyService()
chat_service = ChatService(service=real_beta_service, llm_gateway=mock_llm)

app.dependency_overrides[get_chat_service] = lambda: chat_service
app.dependency_overrides[get_beta_service] = lambda: real_beta_service

client = TestClient(app)

# 1. Store dashboard result in memory
dash_id = "dash_integration_test_99"
val_payload = {
    "dashboard_id": dash_id,
    "status": "success",
    "executiveSummary": "AI diabetic meal planner.",
    "swot": {"strengths": ["Personalized ML model"]},
}
real_beta_service.save_dashboard(dash_id, val_payload)

# Initialize Session
sess_res = client.post("/api/chat/session", json={"dashboard_id": dash_id})
session_id = sess_res.json()["session_id"]

# 2. Test Existing Dashboard Load & Chat Execution
mock_llm.reset_mock()
chat_req = {
    "session_id": session_id,
    "dashboard_id": dash_id,
    "question": "Explain my SWOT analysis",
    "validation_result": {},  # Empty to verify it loads from stored memory!
}

res = client.post("/api/chat/", json=chat_req)
assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
data = res.json()
assert data["status"] == "success"
assert "SWOT analysis shows strong" in data["response"]
assert mock_llm.generate.call_count == 1
print("[OK] Existing dashboard loaded from memory & chat executed (1 LLM call)")

# 3. Test Conversation History Persistence
history = real_beta_service.get_history(session_id)
assert len(history) == 2, f"Expected history length 2, got {len(history)}"
assert history[0].role == "user"
assert history[1].role == "assistant"
print("[OK] Conversation history persists across requests")

# 4. Test Missing Dashboard Returns 404
mock_llm.reset_mock()
missing_req = {
    "session_id": session_id,
    "dashboard_id": "dash_non_existent_99999",
    "question": "Explain SWOT",
    "validation_result": {},
}

res_404 = client.post("/api/chat/", json=missing_req)
assert res_404.status_code == 404, f"Expected 404 for missing dashboard, got {res_404.status_code}"
assert mock_llm.generate.call_count == 0, "LLM must NOT be called when dashboard is missing (404)"
print("[OK] Missing dashboard returns HTTP 404 with 0 LLM calls")

print("\nALL PHASE 10 DASHBOARD INTEGRATION TESTS PASSED SUCCESSFULLY!")
