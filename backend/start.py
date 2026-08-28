"""
backend/start.py
Multi-agent service runner for AI Startup Idea Validator backend.
Runs FastAPI main application along with SWOT, MVP, and GTM agent microservices.
"""

import os
import subprocess
import sys
import time


def main():
    python_exe = sys.executable
    project_dir = os.path.dirname(os.path.abspath(__file__))

    # Ensure backend directory is in PYTHONPATH
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = (
        f"{project_dir}{os.pathsep}{existing_pythonpath}"
        if existing_pythonpath
        else project_dir
    )

    port = os.environ.get("PORT", "8000")
    host = "0.0.0.0" if (os.environ.get("RENDER") or os.environ.get("PORT")) else "127.0.0.1"

    processes = []

    print("==========================================================")
    print("  AI Startup Idea Validator — Multi-Agent Service Runner")
    print(f"  Root Dir: {project_dir}")
    print(f"  Main Host: {host} | Port: {port}")
    print("==========================================================")

    # 1. Main FastAPI Backend
    print(f"[START] Main API -> http://{host}:{port}")
    p_main = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", host, "--port", str(port)],
        cwd=project_dir,
        env=env,
    )
    processes.append(p_main)

    # 2. SWOT Risk Agent (port 8903)
    print("[START] SWOT Agent -> http://127.0.0.1:8903")
    p_swot = subprocess.Popen(
        [python_exe, "swot_risk_agent.py"],
        cwd=project_dir,
        env=env,
    )
    processes.append(p_swot)

    # 3. MVP Feature Recommendation Agent (port 8904)
    print("[START] MVP Agent -> http://127.0.0.1:8904")
    p_mvp = subprocess.Popen(
        [python_exe, "mvp_feature_recommendation_agent.py"],
        cwd=project_dir,
        env=env,
    )
    processes.append(p_mvp)

    # 4. Go-to-Market Strategy Agent (port 8905)
    print("[START] GTM Strategy Agent -> http://127.0.0.1:8905")
    p_gtm = subprocess.Popen(
        [python_exe, "go_to_market_strategy_agent.py"],
        cwd=project_dir,
        env=env,
    )
    processes.append(p_gtm)

    print("==========================================================")
    print("  All 4 services running concurrently.")
    print("  Press Ctrl+C to stop all services.")
    print("==========================================================")

    try:
        while True:
            time.sleep(1)
            # If any process exits unexpectedly, report and monitor
            for p in processes:
                if p.poll() is not None:
                    time.sleep(1)
    except KeyboardInterrupt:
        print("\n[STOPPING] Terminating all services...")
    finally:
        for p in processes:
            if p.poll() is None:
                p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        print("[STOPPED] All services shut down cleanly.")


if __name__ == "__main__":
    main()
