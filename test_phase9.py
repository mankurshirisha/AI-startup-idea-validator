import time
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.chatbot.exceptions import (
    ChatbotTimeoutError,
    GuardrailViolation,
    InvalidLLMResponse,
    LLMGenerationError,
    SessionExpired,
)
from app.chatbot.models import ChatAPIResponse
from app.chatbot.router import get_chat_service
from app.main import app

# 1. Setup Mocked ChatService
mock_chat_service = MagicMock()
mock_chat_service.chat.return_value = MagicMock(
    status="success",
    response="### Answer\nYour SWOT analysis is strong.",
    intent="SWOT",
    latency_ms=12.5,
    conversation_length=2,
)

# Override dependency
app.dependency_overrides[get_chat_service] = lambda: mock_chat_service
client = TestClient(app)

session_payload = {
    "session_id": "sess_test_p9_100",
    "dashboard_id": "dash_p9_100",
    "question": "Explain my SWOT analysis",
    "validation_result": {"idea": "AI Scanner"},
}

# 1. Successful Request Verification
res = client.post("/api/chat/", json=session_payload)
assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
data = res.json()
assert data["status"] == "success"
assert "SWOT analysis" in data["response"]
assert data["intent"] == "SWOT"
assert "request_id" in data
assert len(data["request_id"]) > 0
print("[OK] Successful request & ChatAPIResponse format")

# 2. Input Validation Tests
# Empty Question -> 400
res_empty = client.post("/api/chat/", json={**session_payload, "question": "   "})
assert res_empty.status_code == 400, f"Expected 400 for empty question, got {res_empty.status_code}"

# Question > 500 chars -> 400 / 422
res_long = client.post("/api/chat/", json={**session_payload, "question": "A" * 501})
assert res_long.status_code in (400, 422), f"Expected 400 or 422 for long question, got {res_long.status_code}"

# Missing session_id -> 400 / 422
res_no_sess = client.post("/api/chat/", json={**session_payload, "session_id": ""})
assert res_no_sess.status_code in (400, 422), f"Expected 400 or 422 for missing session_id, got {res_no_sess.status_code}"

# Missing dashboard_id -> 400 / 422
res_no_dash = client.post("/api/chat/", json={**session_payload, "dashboard_id": ""})
assert res_no_dash.status_code in (400, 422), f"Expected 400 or 422 for missing dashboard_id, got {res_no_dash.status_code}"
print("[OK] Input validation checks (empty, max chars, missing session/dashboard IDs)")

# 3. Exception Mapping Tests
# SessionExpired -> 401
mock_chat_service.chat.side_effect = SessionExpired("Session expired.")
res_401 = client.post("/api/chat/", json={**session_payload, "session_id": "sess_expired_1"})
assert res_401.status_code == 401, f"Expected 401, got {res_401.status_code}"

# GuardrailViolation -> 403
mock_chat_service.chat.side_effect = GuardrailViolation("Prompt blocked.")
res_403 = client.post("/api/chat/", json={**session_payload, "session_id": "sess_guard_1"})
assert res_403.status_code == 403, f"Expected 403, got {res_403.status_code}"

# ChatbotTimeoutError -> 504
mock_chat_service.chat.side_effect = ChatbotTimeoutError("Timeout.")
res_504 = client.post("/api/chat/", json={**session_payload, "session_id": "sess_timeout_1"})
assert res_504.status_code == 504, f"Expected 504, got {res_504.status_code}"

# InvalidLLMResponse -> 502
mock_chat_service.chat.side_effect = InvalidLLMResponse("Empty output.")
res_502 = client.post("/api/chat/", json={**session_payload, "session_id": "sess_bad_llm_1"})
assert res_502.status_code == 502, f"Expected 502, got {res_502.status_code}"

# LLMGenerationError -> 500
mock_chat_service.chat.side_effect = LLMGenerationError("LLM error.")
res_500 = client.post("/api/chat/", json={**session_payload, "session_id": "sess_gen_err_1"})
assert res_500.status_code == 500, f"Expected 500, got {res_500.status_code}"
print("[OK] Exception-to-HTTP-status mapping (401, 403, 504, 502, 500)")

# Reset mock side effect
mock_chat_service.chat.side_effect = None
mock_chat_service.chat.return_value = MagicMock(
    status="success",
    response="OK",
    intent="SWOT",
    latency_ms=1.0,
    conversation_length=2,
)

# 4. Rate Limiting Test (30 req / min limit -> 31st request returns 429)
rate_session = "sess_rate_limit_test"
for i in range(30):
    r = client.post("/api/chat/", json={**session_payload, "session_id": rate_session})
    assert r.status_code == 200, f"Request {i+1} failed unexpectedly with {r.status_code}"

r_exceeded = client.post("/api/chat/", json={**session_payload, "session_id": rate_session})
assert r_exceeded.status_code == 429, f"Expected 429 for 31st request, got {r_exceeded.status_code}"
print("[OK] Rate limiting (30 requests/min limit enforced -> 429)")

# 5. OpenAPI Schema Test
schema_res = client.get("/openapi.json")
assert schema_res.status_code == 200
schema = schema_res.json()
assert "/api/chat/" in schema["paths"]
assert "/api/chat/session" in schema["paths"]
print("[OK] OpenAPI schema verification (/api/chat/ and /api/chat/session registered)")

# 6. Benchmark Endpoint Overhead (< 1 ms target)
import logging
from app.chatbot.models import ChatAPIRequest
from app.chatbot.router import chat_endpoint, _RATE_LIMIT_STORE, _DEFAULT_SERVICE

req_obj = ChatAPIRequest(**session_payload)
iterations = 1000

# Disable logging overhead during micro-benchmark
logging.disable(logging.CRITICAL)

t0 = time.perf_counter()
for i in range(iterations):
    _RATE_LIMIT_STORE.clear()
    _ = chat_endpoint(request=req_obj, chat_service=mock_chat_service, beta_service=_DEFAULT_SERVICE)
t1 = time.perf_counter()

logging.disable(logging.NOTSET)

total_ms = (t1 - t0) * 1000
avg_ms = total_ms / iterations

print(f"\n--- ENDPOINT OVERHEAD BENCHMARK (EXCLUDING LLM) ---")
print(f"Average Internal Endpoint Latency: {avg_ms:.4f} ms (Target: < 1.0 ms)")

assert avg_ms < 1.0, f"Endpoint overhead {avg_ms:.4f} ms exceeded 1.0 ms target!"

print("\nALL PHASE 9 UNIT TESTS & BENCHMARKS PASSED SUCCESSFULLY!")
