import asyncio
import json
import time
import httpx

URL = "http://127.0.0.1:8000/api/startup-validator-stream"

FRESHCART_PAYLOAD = {
    "startupIdea": "FreshCart",
    "description": "Hyperlocal 10-minute grocery delivery service.",
    "industry": "E-commerce",
    "targetCustomer": "Urban households",
    "targetCountry": "India",
    "startupStage": "Idea",
    "businessModel": "B2C",
    "keyFeatures": ["10-min delivery", "Live tracking", "Subscription plan"]
}

QUICKMEDAI_PAYLOAD = {
    "startupIdea": "QuickMedAI",
    "description": "AI-powered instant prescription analysis and triage.",
    "industry": "HealthTech",
    "targetCustomer": "Patients and Clinics",
    "targetCountry": "Global",
    "startupStage": "Idea",
    "businessModel": "B2B",
    "keyFeatures": ["Prescription scan", "AI triage", "Clinic integration"]
}

async def run_stream(name: str, payload: dict):
    t0 = time.perf_counter()
    print(f"[{time.strftime('%H:%M:%S')}] [{name}] STARTING STREAM REQUEST")
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", URL, json=payload) as response:
            print(f"[{time.strftime('%H:%M:%S')}] [{name}] HTTP Status: {response.status_code}")
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    try:
                        data = json.loads(data_str)
                        stage = data.get("stage")
                        status = data.get("status")
                        elapsed = time.perf_counter() - t0
                        print(f"[{time.strftime('%H:%M:%S')}] [{name}] (+{elapsed:.2f}s) SSE EVENT: stage={stage}, status={status}")
                        if stage == "done":
                            print(f"[{time.strftime('%H:%M:%S')}] [{name}] (+{elapsed:.2f}s) COMPLETED SUCCESSFULLY!")
                    except Exception as e:
                        print(f"[{time.strftime('%H:%M:%S')}] [{name}] SSE PARSE ERROR: {e}")

async def main():
    print("=" * 70)
    print("RUNNING CONCURRENT VALIDATION TEST (FreshCart & QuickMedAI)")
    print("=" * 70)
    task1 = asyncio.create_task(run_stream("FreshCart", FRESHCART_PAYLOAD))
    task2 = asyncio.create_task(run_stream("QuickMedAI", QUICKMEDAI_PAYLOAD))
    await asyncio.gather(task1, task2)

if __name__ == "__main__":
    asyncio.run(main())
