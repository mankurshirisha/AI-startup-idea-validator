"""
Test script for SWOT and Risk Analysis Agent.
Endpoint: POST /api/swot-risk-agent on http://127.0.0.1:8903
"""

import json
import os
import sys
import pytest
import requests

RUN_LIVE = os.getenv("RUN_LIVE_SWOT_TESTS") == "1"

pytestmark = pytest.mark.skipif(
    not RUN_LIVE,
    reason="Live SWOT agent server tests are skipped by default during automated testing. Set RUN_LIVE_SWOT_TESTS=1 to run manually."
)

BASE_URL = "http://127.0.0.1:8903"

STREETBYTE_PAYLOAD = {
    "startupIdea": "StreetByte",
    "description": "A digital ordering and payment platform for street food vendors.",
    "industry": "FoodTech",
    "targetCustomer": "Street food vendors and urban customers",
    "targetCountry": "India",
    "startupStage": "Idea",
    "businessModel": "B2C",
    "keyFeatures": [
        "QR ordering",
        "Digital payments",
        "Vendor dashboard",
        "Customer loyalty"
    ]
}


def test_health():
    print("=" * 60)
    print("TEST 1: Health Check GET /")
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print(f"  Status: {r.status_code} OK")
    print(f"  Response: {r.json()}")
    print("  PASSED")


def test_swot_endpoint():
    print()
    print("=" * 60)
    print("TEST 2: POST /api/swot-risk-agent — StreetByte payload")
    r = requests.post(
        f"{BASE_URL}/api/swot-risk-agent",
        json=STREETBYTE_PAYLOAD,
        timeout=60,
    )
    print(f"  HTTP Status: {r.status_code}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    data = r.json()
    assert isinstance(data, dict), "Response must be a JSON object"

    # Validate required keys
    required_keys = ["status", "swot_analysis", "risk_analysis",
                     "overall_risk_level", "recommendations"]
    for key in required_keys:
        assert key in data, f"Missing key: '{key}' in response"
        print(f"  ✓ Key present: {key}")

    # Validate SWOT sub-keys
    swot = data["swot_analysis"]
    for sub_key in ["strengths", "weaknesses", "opportunities", "threats"]:
        assert sub_key in swot, f"Missing SWOT key: '{sub_key}'"
        assert isinstance(swot[sub_key], list), f"'{sub_key}' must be a list"
        assert len(swot[sub_key]) > 0, f"'{sub_key}' must not be empty"
        print(f"  ✓ SWOT.{sub_key}: {len(swot[sub_key])} items")

    # Validate Risk Analysis sub-keys
    risk = data["risk_analysis"]
    risk_keys = ["market_risk", "competition_risk", "technical_risk",
                 "financial_risk", "execution_risk", "regulatory_risk"]
    for rk in risk_keys:
        assert rk in risk, f"Missing risk key: '{rk}'"
        assert "level" in risk[rk], f"Risk '{rk}' missing 'level'"
        assert "risks" in risk[rk], f"Risk '{rk}' missing 'risks'"
        print(f"  ✓ Risk.{rk}: level={risk[rk]['level']}")

    print()
    print("  FULL RESPONSE SUMMARY:")
    print(f"    status          : {data['status']}")
    print(f"    overall_risk    : {data['overall_risk_level']}")
    print(f"    recommendations : {len(data['recommendations'])} items")
    print()
    print("  PASSED")


def test_validation_error():
    print()
    print("=" * 60)
    print("TEST 3: POST /api/swot-risk-agent — missing required field")
    r = requests.post(
        f"{BASE_URL}/api/swot-risk-agent",
        json={},
        timeout=10,
    )
    # Pydantic will return 422 for missing required fields
    assert r.status_code == 422, f"Expected 422 for missing fields, got {r.status_code}"
    print(f"  Status: {r.status_code} (Unprocessable Entity — expected)")
    print("  PASSED")


if __name__ == "__main__":
    os.environ["RUN_LIVE_SWOT_TESTS"] = "1"
    print()
    print("================================================================")
    print("  SWOT Risk Agent Test Suite")
    print("  Endpoint: POST http://127.0.0.1:8903/api/swot-risk-agent")
    print("================================================================")

    try:
        test_health()
        test_swot_endpoint()
        test_validation_error()

        print()
        print("================================================================")
        print("  ALL SWOT AGENT TESTS PASSED")
        print("  Swagger docs: http://127.0.0.1:8903/docs")
        print("================================================================")
        sys.exit(0)

    except AssertionError as e:
        print(f"\n  FAILED: {e}")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("\n  ERROR: Cannot connect to http://127.0.0.1:8903")
        print("  Make sure the SWOT agent is running:")
        print("    python swot_risk_agent.py")
        sys.exit(1)
