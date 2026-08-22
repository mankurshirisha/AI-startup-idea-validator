import threading
import time
import os
from google import genai
from google.genai import types

api_key = os.getenv("GEMINI_API_KEY")

shared_client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=20000))

def worker_shared(id, model):
    print(f"[{threading.current_thread().name}] Worker {id} START with SHARED client...")
    t0 = time.perf_counter()
    try:
        res = shared_client.models.generate_content(model=model, contents=f"Test prompt {id}")
        print(f"[{threading.current_thread().name}] Worker {id} SUCCESS in {time.perf_counter()-t0:.2f}s, len={len(res.text or '')}")
    except Exception as e:
        print(f"[{threading.current_thread().name}] Worker {id} EXCEPTION in {time.perf_counter()-t0:.2f}s: {e}")

def test_shared_concurrency():
    print("=" * 60)
    print("TESTING CONCURRENT CALLS WITH SHARED genai.Client SINGLETON")
    print("=" * 60)
    t1 = threading.Thread(target=worker_shared, args=(1, "gemini-3.1-flash-lite"))
    t2 = threading.Thread(target=worker_shared, args=(2, "gemini-3.1-flash-lite"))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

if __name__ == "__main__":
    test_shared_concurrency()
