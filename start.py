import logging
import subprocess
import sys
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

processes = []

files = [
    "web_search_agent.py",
    "market_opportunity_agent.py",
    "competitor_discovery_agent.py",
    "comparison_agent.py",
]

try:
    for file in files:
        logger.info("Starting %s...", file)
        process = subprocess.Popen([sys.executable, file])
        processes.append(process)
        time.sleep(2)

    logger.info("Starting Main Application...")

    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--reload",
        ]
    )

finally:
    logger.info("Stopping all agent servers...")
    for process in processes:
        process.terminate()
