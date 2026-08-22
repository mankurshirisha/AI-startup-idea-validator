import requests
import json
import time

MAIN_URL = "http://127.0.0.1:8000"

PAYLOAD = {
    "startupIdea": "BiteTrack",
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

def test_synchronous_pipeline():
    print("=" * 70)
    print("TEST 1: POST /api/startup-validator (Synchronous Full Pipeline)")
    print("=" * 70)
    t0 = time.time()
    resp = requests.post(f"{MAIN_URL}/api/startup-validator", json=PAYLOAD, timeout=(30, 600))
    elapsed = time.time() - t0
    print(f"Status: {resp.status_code} | Total Latency: {elapsed:.2f}s")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    data = resp.json()
    assert data.get("status") == "success", "Response status must be 'success'"
    assert "web_search" in data, "Missing web_search"
    assert "market_opportunity" in data, "Missing market_opportunity"
    assert "competitor_analysis" in data, "Missing competitor_analysis"
    assert "comparison" in data, "Missing comparison"
    assert "swot_analysis" in data, "Missing swot_analysis"
    assert "mvp_recommendation" in data, "Missing mvp_recommendation"

    print("✓ All 6 pipeline agent keys present in response:")
    print("  - web_search")
    print("  - market_opportunity")
    print("  - competitor_analysis")
    print("  - comparison")
    print("  - swot_analysis")
    print("  - mvp_recommendation")

    # Validate SWOT structure
    swot = data["swot_analysis"]
    assert "swot_analysis" in swot or "strengths" in swot, "Invalid SWOT agent output structure"
    print(f"✓ SWOT Agent output: overall_risk={swot.get('overall_risk_level')}, recommendations={len(swot.get('recommendations', []))}")

    # Validate MVP structure
    mvp = data["mvp_recommendation"]
    assert "features" in mvp, "Invalid MVP agent output structure: missing 'features'"
    print(f"✓ MVP Agent output: features={len(mvp.get('features', []))}, deferred={len(mvp.get('deferredFeatures', []))}")


def test_sse_stream_pipeline():
    print()
    print("=" * 70)
    print("TEST 2: POST /api/startup-validator-stream (SSE Streaming Pipeline)")
    print("=" * 70)
    stream_payload = dict(PAYLOAD)
    stream_payload["startupIdea"] = "VendorPay"
    t0 = time.time()
    resp = requests.post(f"{MAIN_URL}/api/startup-validator-stream", json=stream_payload, stream=True, timeout=(30, 600))
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    stages_seen = []
    final_result = None

    for line in resp.iter_lines():
        if not line:
            continue
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            raw_json = line_str[6:].strip()
            event = json.loads(raw_json)
            stage = event.get("stage")
            status = event.get("status")
            if stage and status:
                stages_seen.append((stage, status))
                print(f"  [SSE Event] stage={stage:<16} | status={status}")
            if stage == "done":
                final_result = event.get("result")
                print("  [SSE Event] stage=done RECEIVED!")

    elapsed = time.time() - t0
    print(f"SSE Stream finished in {elapsed:.2f}s")
    assert final_result is not None, "SSE stream did not emit 'done' event with result"

    # Verify all 6 agent stages were streamed
    stage_names = [s[0] for s in stages_seen]
    for required in ["web_search", "market_opp", "competitor", "comparison", "swot_risk", "mvp_feature"]:
        assert required in stage_names, f"Missing SSE stage: {required}"
        print(f"  ✓ SSE stage verified: {required}")

    print()
    print("================================================================")
    print("  COMPLETE PIPELINE END-TO-END VERIFICATION PASSED 100%")
    print("================================================================")

if __name__ == "__main__":
    test_synchronous_pipeline()
    test_sse_stream_pipeline()
