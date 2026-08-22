import threading
import time
import requests
from app.models import StartupRequest
from app.orchestrator import orchestrate_swot_risk

def mock_run_swot_job(request, web_result, market_result, competitor_result):
    print(f"[{threading.current_thread().name}] mock_run_swot_job START for {request.startupIdea}")
    swot_endpoint = "http://127.0.0.1:8903/api/swot-risk-agent"
    payload = {
        "startupIdea": request.startupIdea,
        "description": request.description or "",
        "industry": request.industry or "General Tech",
        "targetCustomer": request.targetCustomer or "General Consumers",
        "targetCountry": request.targetCountry or "Global",
        "startupStage": request.startupStage or "Idea",
        "businessModel": request.businessModel or "B2C",
        "keyFeatures": request.keyFeatures or [],
        "marketData": market_result or {},
        "competitors": [],
    }
    t0 = time.perf_counter()
    print(f"[{threading.current_thread().name}] Sending POST to {swot_endpoint}...")
    try:
        resp = requests.post(swot_endpoint, json=payload, timeout=60)
        print(f"[{threading.current_thread().name}] Response code: {resp.status_code} in {time.perf_counter()-t0:.2f}s")
        return resp.json()
    except Exception as e:
        print(f"[{threading.current_thread().name}] Exception in mock_run_swot_job: {e}")
        return {"status": "error", "detail": str(e)}

def run_test(name, idea, industry):
    req = StartupRequest(startupIdea=idea, industry=industry)
    print(f"[{threading.current_thread().name}] Calling orchestrate_swot_risk for {name}")
    res = orchestrate_swot_risk(mock_run_swot_job, req, {"industry": industry}, {}, {})
    print(f"[{threading.current_thread().name}] orchestrate_swot_risk DONE for {name}")

t1 = threading.Thread(target=run_test, args=("Req1", "FreshCart", "E-commerce"))
t2 = threading.Thread(target=run_test, args=("Req2", "QuickMedAI", "HealthTech"))

print("Starting concurrent SWOT orchestration test...")
t1.start()
t2.start()

t1.join(timeout=30)
t2.join(timeout=30)

print(f"t1 is_alive: {t1.is_alive()}, t2 is_alive: {t2.is_alive()}")
