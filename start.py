import logging

import uvicorn

from app.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    logger.info("Starting Main Application...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
