import logging
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Main Application...")

    uvicorn.run(
        "app.main:app",      # Import string required for reload=True
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )