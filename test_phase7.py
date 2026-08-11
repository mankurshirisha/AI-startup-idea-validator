import time
from unittest.mock import MagicMock
from app.chatbot import (
    LLMGateway,
    LLMResponse,
    PromptPackage,
    InvalidLLMResponse,
    ChatbotTimeoutError,
    LLMGenerationError,
)

prompt_pkg = PromptPackage(
    system_prompt="You are BetaBuddy.",
    user_prompt="Explain my SWOT analysis",
)

# 1. Successful Generation & Trimming
mock_client_success = MagicMock()
mock_raw_res = MagicMock()
mock_raw_res.text = "   ### Answer\nYour SWOT looks strong.   "
mock_client_success.models.generate_content.return_value = mock_raw_res

gateway = LLMGateway(gemini_client=mock_client_success)
res = gateway.generate(prompt_pkg)

assert isinstance(res, LLMResponse)
assert res.response_text == "### Answer\nYour SWOT looks strong."
assert res.latency_ms > 0
print("[OK] Successful generation & trimming")

# 2. Empty Response Rejection
mock_client_empty = MagicMock()
mock_raw_empty = MagicMock()
mock_raw_empty.text = "   "
mock_client_empty.models.generate_content.return_value = mock_raw_empty

gateway_empty = LLMGateway(gemini_client=mock_client_empty)
try:
    gateway_empty.generate(prompt_pkg)
    assert False, "Should raise InvalidLLMResponse for empty output"
except InvalidLLMResponse:
    print("[OK] Empty response rejection")

# 3. Character Limit Enforcement (>3000 chars)
mock_client_long = MagicMock()
mock_raw_long = MagicMock()
mock_raw_long.text = "A" * 3005
mock_client_long.models.generate_content.return_value = mock_raw_long

gateway_long = LLMGateway(gemini_client=mock_client_long)
try:
    gateway_long.generate(prompt_pkg)
    assert False, "Should raise InvalidLLMResponse for >3000 chars"
except InvalidLLMResponse:
    print("[OK] Character limit enforcement (>3000 chars)")

# 4. Timeout Handling
mock_client_timeout = MagicMock()
mock_client_timeout.models.generate_content.side_effect = Exception("Request timed out after 20s")

gateway_timeout = LLMGateway(gemini_client=mock_client_timeout)
try:
    gateway_timeout.generate(prompt_pkg)
    assert False, "Should raise ChatbotTimeoutError on timeout"
except ChatbotTimeoutError:
    print("[OK] Timeout handling")

# 5. Retry Logic on 429 Status Error
mock_client_retry = MagicMock()
mock_raw_retry_success = MagicMock()
mock_raw_retry_success.text = "Success on retry!"
mock_client_retry.models.generate_content.side_effect = [
    Exception("429 Resource Exhausted"),
    mock_raw_retry_success,
]

gateway_retry = LLMGateway(gemini_client=mock_client_retry)
res_retry = gateway_retry.generate(prompt_pkg)
assert res_retry.response_text == "Success on retry!"
assert mock_client_retry.models.generate_content.call_count == 2
print("[OK] Retry logic (retried on 429 and succeeded)")

# 6. Benchmark
iterations = 100
t0 = time.perf_counter()
for _ in range(iterations):
    _ = gateway.generate(prompt_pkg)
t1 = time.perf_counter()
avg_ms = ((t1 - t0) * 1000) / iterations

print(f"\n--- LATENCY BENCHMARK (MOCKED GATEWAY) ---")
print(f"Average Gateway Overhead: {avg_ms:.4f} ms per call")

print("\nALL PHASE 7 UNIT TESTS PASSED SUCCESSFULLY!")
