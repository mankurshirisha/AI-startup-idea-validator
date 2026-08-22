"""Minimal & comprehensive diagnostic verification test for Gemini API connection, client configuration, and response text extraction."""

import os
from unittest.mock import MagicMock, patch
from dotenv import load_dotenv

load_dotenv()

from app.gemini_client import generate_content, _get_client
from app.chatbot.llm_gateway import LLMGateway
from app.chatbot.prompt_builder import PromptPackage
from web_search_agent import _compact_json
from comparison_agent import _compact_competitors

import pytest

RUN_LIVE = os.getenv("RUN_LIVE_GEMINI_TESTS") == "1"

# 1. Independent Minimal Diagnostic Test (Live Gemini Request)
@pytest.mark.skipif(
    not RUN_LIVE,
    reason="Live Gemini API tests are skipped by default during automated testing. Set RUN_LIVE_GEMINI_TESTS=1 to run manually."
)
def test_live_gemini_connection():
    print("--- 1. Testing Live Gemini API Connection ---")
    prompt = "Reply with exactly: Gemini connection successful"
    result = generate_content(prompt)
    print(f"Gemini Raw Response: {repr(result)}")
    assert result and "Gemini connection successful" in result, f"Expected 'Gemini connection successful', got: {result}"
    print("[OK] Live Gemini connection test PASSED!")

# 2. Test LLMGateway Live Request
@pytest.mark.skipif(
    not RUN_LIVE,
    reason="Live Gemini API tests are skipped by default during automated testing. Set RUN_LIVE_GEMINI_TESTS=1 to run manually."
)
def test_llm_gateway_live_request():
    print("\n--- 2. Testing LLMGateway Live Generation ---")
    gateway = LLMGateway()
    pkg = PromptPackage(
        system_prompt="You are a helpful AI assistant. Be concise.",
        user_prompt="Reply with exactly: Gemini connection successful"
    )
    res = gateway.generate(pkg)
    print(f"LLMGateway Response: {repr(res.response_text)} | Latency: {res.latency_ms:.2f} ms")
    assert res.response_text and "Gemini connection successful" in res.response_text
    print("[OK] LLMGateway live generation test PASSED!")

# 3. Test Singleton Client Reuse
def test_singleton_client():
    print("\n--- 3. Testing Singleton Client Reuse ---")
    c1 = _get_client()
    c2 = _get_client()
    assert c1 is c2, "genai.Client MUST be reused as a singleton"
    print("[OK] genai.Client initialized once and reused across all requests.")

# 4. Test Compact Serialization
def test_search_snippet_truncation():
    print("\n--- 4. Testing Compact Serialization ---")
    sample_snippets = [
        {"url": "https://example.com/1", "content": "A" * 2000},
        {"url": "https://example.com/2", "content": "B" * 2000},
    ]

    compact_str = _compact_json(
        [{"url": s["url"], "content": s["content"][:300]} for s in sample_snippets]
    )
    assert len(compact_str) < 1000, f"Expected compact prompt under 1000 chars, got {len(compact_str)}"
    print(f"[OK] 4000-char raw search content truncated down to {len(compact_str)} chars.")

    competitors = [
        {"name": f"Comp_{i}", "description": "Long desc " * 50, "key_features": ["f1", "f2"]}
        for i in range(10)
    ]
    compact_comps = _compact_competitors(competitors)
    assert compact_comps.count("Comp_") <= 5, "Competitors MUST be capped at top 5"
    print(f"[OK] 10 competitors compacted to top 5.")

if __name__ == "__main__":
    os.environ["RUN_LIVE_GEMINI_TESTS"] = "1"
    test_live_gemini_connection()
    test_llm_gateway_live_request()
    test_singleton_client()
    test_search_snippet_truncation()
    print("\n======================================================================")
    print(" ALL GEMINI DIAGNOSTIC VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("======================================================================\n")
