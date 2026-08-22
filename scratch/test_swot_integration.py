import requests
import json

MAIN_URL = "http://127.0.0.1:8000"

PAYLOAD = {
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

def test_main_swot_pipeline():
    print("Testing POST http://127.0.0.1:8000/api/startup-validator...")
    resp = requests.post(f"{MAIN_URL}/api/startup-validator", json=PAYLOAD, timeout=120)
    print(f"Status code: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    data = resp.json()
    print("Top-level keys in response:")
    for k in data.keys():
        print(f" - {k}")
    
    assert "swot_analysis" in data, "Missing 'swot_analysis' key in main pipeline response!"
    swot = data["swot_analysis"]
    print("\nSWOT Analysis agent output returned from main pipeline:")
    print(json.dumps(swot, indent=2))
    
    assert swot.get("status") == "success", f"SWOT status expected success, got {swot.get('status')}"
    assert "swot_analysis" in swot or "strengths" in swot, "SWOT response structured data missing!"
    print("\n✓ SUCCESS: Main pipeline successfully executed SWOT Risk Agent!")

if __name__ == "__main__":
    test_main_swot_pipeline()
