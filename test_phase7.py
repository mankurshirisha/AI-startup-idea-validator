import time
import pytest
from unittest.mock import MagicMock
from app.chatbot import (
    LLMGateway,
    LLMResponse,
    PromptPackage,
    InvalidLLMResponse,
    ChatbotTimeoutError,
    LLMGenerationError,
)
from app.chatbot.llm_gateway import HIGH_DEMAND_MESSAGE

PROMPT_PKG = PromptPackage(
    system_prompt="You are BetaBuddy.",
    user_prompt="Explain my SWOT analysis",
)


def _setup_mock_client(text_val: str = "", side_effect: any = None):
    mock_client = MagicMock()
    if side_effect:
        mock_client.models.generate_content.side_effect = side_effect
        mock_client.interactions.create.side_effect = side_effect
    else:
        mock_raw = MagicMock()
        mock_raw.text = text_val
        mock_raw.output_text = text_val
        mock_client.models.generate_content.return_value = mock_raw
        mock_client.interactions.create.return_value = mock_raw
    return mock_client


def test_successful_generation_and_trimming():
    mock_client = _setup_mock_client("   ### Answer\nYour SWOT looks strong.   ")
    gateway = LLMGateway(gemini_client=mock_client)
    res = gateway.generate(PROMPT_PKG)

    assert isinstance(res, LLMResponse)
    assert res.response_text == "### Answer\nYour SWOT looks strong."
    assert res.latency_ms > 0


def test_empty_response_rejection():
    mock_client = _setup_mock_client("   ")
    gateway_empty = LLMGateway(gemini_client=mock_client)
    res = gateway_empty.generate(PROMPT_PKG)
    assert res.response_text == HIGH_DEMAND_MESSAGE


def test_character_limit_enforcement():
    mock_client = _setup_mock_client("A" * 3005)
    gateway = LLMGateway(gemini_client=mock_client)
    res_long = gateway.generate(PROMPT_PKG)
    assert len(res_long.response_text) == 3000


def test_timeout_handling():
    mock_client = _setup_mock_client(side_effect=Exception("Request timed out after 20s"))
    gateway_timeout = LLMGateway(gemini_client=mock_client)
    res = gateway_timeout.generate(PROMPT_PKG)
    assert res.response_text == HIGH_DEMAND_MESSAGE


def test_retry_logic_on_429_status_error():
    mock_raw_retry_success = MagicMock()
    mock_raw_retry_success.text = "Success on retry!"
    mock_raw_retry_success.output_text = "Success on retry!"

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [
        Exception("429 Resource Exhausted"),
        mock_raw_retry_success,
    ]
    mock_client.interactions.create.side_effect = [
        Exception("429 Resource Exhausted"),
        mock_raw_retry_success,
    ]

    gateway = LLMGateway(gemini_client=mock_client)
    res_retry = gateway.generate(PROMPT_PKG)
    assert res_retry.response_text == "Success on retry!"
    assert mock_client.models.generate_content.call_count == 2


def run_benchmark():
    mock_client = _setup_mock_client("   ### Answer\nYour SWOT looks strong.   ")
    gateway = LLMGateway(gemini_client=mock_client)
    iterations = 100
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = gateway.generate(PROMPT_PKG)
    t1 = time.perf_counter()
    avg_ms = ((t1 - t0) * 1000) / iterations

    print(f"\n--- LATENCY BENCHMARK (MOCKED GATEWAY) ---")
    print(f"Average Gateway Overhead: {avg_ms:.4f} ms per call")


if __name__ == "__main__":
    test_successful_generation_and_trimming()
    print("[OK] Successful generation & trimming")

    test_empty_response_rejection()
    print("[OK] Empty response rejection")

    test_character_limit_enforcement()
    print("[OK] Character limit enforcement (>3000 chars safely truncated)")

    test_timeout_handling()
    print("[OK] Timeout handling")

    test_retry_logic_on_429_status_error()
    print("[OK] Retry logic (retried on 429 and succeeded)")

    run_benchmark()
    print("\nALL PHASE 7 UNIT TESTS PASSED SUCCESSFULLY!")
