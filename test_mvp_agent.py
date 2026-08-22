"""
Test script for MVP Feature Recommendation Agent.
Endpoint: POST /api/mvp-feature-agent on http://127.0.0.1:8904
"""

import json
import sys
import requests

BASE_URL = "http://127.0.0.1:8904"

STREETBYTE_PAYLOAD = {
    "startupIdea": "StreetByte",
    "description": "A digital ordering and payment platform for street food vendors.",
    "industry": "FoodTech",
    "location": "India",
    "startupStage": "Idea",
    "businessModel": "B2C",
    "targetCustomer": [
        "Street food vendors",
        "Urban customers"
    ],
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


def test_mvp_endpoint():
    print()
    print("=" * 60)
    print("TEST 2: POST /api/mvp-feature-agent — StreetByte payload")
    r = requests.post(
        f"{BASE_URL}/api/mvp-feature-agent",
        json=STREETBYTE_PAYLOAD,
        timeout=60,
    )
    print(f"  HTTP Status: {r.status_code}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    data = r.json()
    assert isinstance(data, dict), "Response must be a JSON object"

    # Validate required top-level keys
    required_keys = ["status", "startupIdea", "industry", "location",
                     "mvpRecommendation", "features", "deferredFeatures"]
    for key in required_keys:
        assert key in data, f"Missing key: '{key}' in response"
        print(f"  ✓ Key present: {key}")

    # Validate status
    assert data["status"] == "success", f"Expected status='success', got '{data['status']}'"

    # Validate features list
    features = data["features"]
    assert isinstance(features, list), "'features' must be a list"
    assert len(features) > 0, "'features' must not be empty"
    print(f"  ✓ features: {len(features)} MVP features returned")

    # Validate each feature has required sub-fields
    required_feature_keys = ["feature", "priority", "marketFit",
                              "customerValue", "resourceEffort", "reason", "mvpPhase"]
    for i, feat in enumerate(features):
        for fk in required_feature_keys:
            assert fk in feat, f"Feature[{i}] missing key: '{fk}'"
        print(f"    - {feat['feature']} | priority={feat['priority']} | phase={feat['mvpPhase']}")

    # Validate deferred features
    deferred = data["deferredFeatures"]
    assert isinstance(deferred, list), "'deferredFeatures' must be a list"
    print(f"  ✓ deferredFeatures: {len(deferred)} deferred")

    # Validate MVP recommendation
    mvp_rec = data["mvpRecommendation"]
    assert "summary" in mvp_rec, "'mvpRecommendation' missing 'summary'"
    assert "overallStrategy" in mvp_rec, "'mvpRecommendation' missing 'overallStrategy'"
    print(f"  ✓ mvpRecommendation.summary: {mvp_rec['summary'][:80]}...")

    # Verify all input keyFeatures are accounted for
    all_returned_features = {
        f.get("feature", "").lower().strip()
        for f in features
    } | {str(d).lower().strip() for d in deferred}
    for orig in STREETBYTE_PAYLOAD["keyFeatures"]:
        assert orig.lower().strip() in all_returned_features, \
            f"Input feature '{orig}' not accounted for in features or deferredFeatures"
        print(f"  ✓ Input feature accounted for: '{orig}'")

    print()
    print("  FULL RESPONSE SUMMARY:")
    print(f"    status          : {data['status']}")
    print(f"    startupIdea     : {data['startupIdea']}")
    print(f"    MVP features    : {len(features)}")
    print(f"    Deferred        : {len(deferred)}")
    print()
    print("  PASSED")


def test_validation_error():
    print()
    print("=" * 60)
    print("TEST 3: POST /api/mvp-feature-agent — missing required field")
    r = requests.post(
        f"{BASE_URL}/api/mvp-feature-agent",
        json={},
        timeout=10,
    )
    # Pydantic returns 422 for missing required fields
    assert r.status_code == 422, f"Expected 422 for missing fields, got {r.status_code}"
    print(f"  Status: {r.status_code} (Unprocessable Entity — expected)")
    print("  PASSED")


if __name__ == "__main__":
    print()
    print("================================================================")
    print("  MVP Feature Recommendation Agent Test Suite")
    print("  Endpoint: POST http://127.0.0.1:8904/api/mvp-feature-agent")
    print("================================================================")

    try:
        test_health()
        test_mvp_endpoint()
        test_validation_error()

        print()
        print("================================================================")
        print("  ALL MVP AGENT TESTS PASSED")
        print("  Swagger docs: http://127.0.0.1:8904/docs")
        print("================================================================")
        sys.exit(0)

    except AssertionError as e:
        print(f"\n  FAILED: {e}")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("\n  ERROR: Cannot connect to http://127.0.0.1:8904")
        print("  Make sure the MVP agent is running:")
        print("    python mvp_feature_recommendation_agent.py")
        sys.exit(1)
