import logging
import os

from dotenv import load_dotenv
from tavily import TavilyClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

key = os.getenv("TAVILY_API_KEY")

logger.info("Loaded Tavily API key: %r", bool(key))

client = TavilyClient(api_key=key)

try:
    response = client.search(query="AI Resume Builder", search_depth="basic")

    logger.info("Tavily search completed successfully")
    logger.debug("Tavily response: %s", response)

except Exception as e:
    logger.exception("Tavily search failed")
