import time
from unittest.mock import MagicMock
from app.chatbot import (
    BetaBuddyService,
    BetaBuddyOrchestrator,
    ChatService,
    ChatResult,
    LLMResponse,
    SessionExpired,
)

# 1. Setup Mocked LLMGateway & Dependencies
mock_llm = MagicMock()
mock_llm.generate.return_value = LLMResponse(
    response_text="### Answer\nYour SWOT analysis indicates strong static scanning capabilities.",
    latency_ms=150.0,
)

service = BetaBuddyService()
orchestrator = BetaBuddyOrchestrator(service=service)
chat_service = ChatService(service=service, orchestrator=orchestrator, llm_gateway=mock_llm)

dashboard_id = "dash_service_101"
session_id = service.create_session(dashboard_id=dashboard_id)

raw_result = {
    "idea": "AI Code Audit",
    "executiveSummary": "Enterprise code scanner for AI vulnerabilities.",
    "swot": {"strengths": ["Static analysis engine"]},
}

# 2. Test Successful Conversation Path
res = chat_service.chat(
    session_id=session_id,
    dashboard_id=dashboard_id,
    validation_result=raw_result,
    user_question="Explain my SWOT analysis",
)

assert isinstance(res, ChatResult)
assert res.status == "success"
assert "SWOT analysis indicates strong" in res.response
assert res.intent == "SWOT"
assert res.latency_ms > 0
assert res.conversation_length == 2  # 1 User msg + 1 Assistant msg
assert mock_llm.generate.call_count == 1
print("[OK] Successful conversation flow (LLM called exactly once, assistant reply stored)")

# 3. Test Clarification Path (LLM must NOT be called)
mock_llm.reset_mock()
res_clarify = chat_service.chat(
    session_id=session_id,
    dashboard_id=dashboard_id,
    validation_result=raw_result,
    user_question="random gibberish qwertyuiop zxcvbnm",
)

assert res_clarify.status == "clarification_required"
assert "Could you rephrase" in res_clarify.response
assert mock_llm.generate.call_count == 0  # LLM NOT CALLED
print("[OK] Clarification path (LLM skipped, 0 calls)")

# 4. Test Session Expiration
try:
    chat_service.chat(
        session_id="invalid_session_9999",
        dashboard_id=dashboard_id,
        validation_result=raw_result,
        user_question="Explain SWOT",
    )
    assert False, "Should raise SessionExpired for invalid session ID"
except SessionExpired:
    print("[OK] Session expiration exception handling")

# 5. Benchmark (Mocked ChatService)
iterations = 500
t0 = time.perf_counter()
for _ in range(iterations):
    _ = chat_service.chat(
        session_id=session_id,
        dashboard_id=dashboard_id,
        validation_result=raw_result,
        user_question="Explain my SWOT analysis",
    )
t1 = time.perf_counter()

total_ms = (t1 - t0) * 1000
avg_ms = total_ms / iterations

print(f"\n--- CHAT SERVICE LATENCY BENCHMARK (EXCLUDING LLM) ---")
print(f"Average ChatService Overhead: {avg_ms:.4f} ms per request")

print("\nALL PHASE 8 UNIT TESTS & BENCHMARKS PASSED SUCCESSFULLY!")
