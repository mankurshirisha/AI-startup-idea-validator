import time
from app.chatbot import (
    BetaBuddyService,
    BetaBuddyOrchestrator,
    PreparedChatRequest,
)

service = BetaBuddyService()
orchestrator = BetaBuddyOrchestrator(service=service)

# Initialize Session
session_id = service.create_session(dashboard_id="dash_orch_789")
service.add_message(session_id, "user", "Hi")
service.add_message(session_id, "assistant", "Hello! I am BetaBuddy.")

raw_result = {
    "idea": "AI Code Audit",
    "description": "Automated security code scanner.",
    "validationScore": 92,
    "executiveSummary": "Enterprise code scanner for AI vulnerabilities.",
    "swot": {
        "strengths": ["Static analysis engine"],
        "weaknesses": ["Requires repo access"],
    },
    "competitors": [{"name": "Snyk", "description": "DevSecOps platform"}],
}

# 1. Test Full Preparation Flow (Status: ready)
req = orchestrator.prepare_request(
    session_id=session_id,
    dashboard_id="dash_orch_789",
    validation_result=raw_result,
    user_question="Explain my SWOT analysis",
)

assert isinstance(req, PreparedChatRequest)
assert req.status == "ready"
assert req.intent == "SWOT"
assert req.prompt_package is not None
assert "BetaBuddy" in req.prompt_package.system_prompt
assert "SWOT" in req.retrieved_context.intent
assert len(req.conversation_history) == 2
print("[OK] Full orchestration preparation flow (ready)")

# 2. Test Clarification Flow (Status: clarification_required)
req_clarify = orchestrator.prepare_request(
    session_id=session_id,
    dashboard_id="dash_orch_789",
    validation_result=raw_result,
    user_question="random gibberish qwertyuiop zxcvbnm",
)

assert req_clarify.status == "clarification_required"
assert req_clarify.prompt_package is None
assert req_clarify.intent == "UNKNOWN"
print("[OK] Clarification flow handling (clarification_required)")

# 3. Latency Benchmark (< 2 ms target)
iterations = 1000
t0 = time.perf_counter()
for _ in range(iterations):
    _ = orchestrator.prepare_request(
        session_id=session_id,
        dashboard_id="dash_orch_789",
        validation_result=raw_result,
        user_question="Explain my SWOT analysis",
    )
t1 = time.perf_counter()

total_ms = (t1 - t0) * 1000
avg_ms = total_ms / iterations

print(f"\n--- LATENCY BENCHMARK ---")
print(f"Total time for {iterations} orchestrations: {total_ms:.2f} ms")
print(f"Average Orchestration Latency: {avg_ms:.4f} ms (Target: < 2.0 ms)")

assert avg_ms < 2.0, f"Orchestration average latency {avg_ms:.4f} ms exceeded 2.0 ms target!"

print("\nALL PHASE 6 ORCHESTRATION TESTS & BENCHMARKS PASSED SUCCESSFULLY!")
