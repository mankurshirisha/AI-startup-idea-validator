from crewai import Agent, LLM

from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from app.tools import (
    web_search_tool,
    market_opportunity_tool,
    competitor_discovery_tool,
    comparison_tool,
)

# ==============================
# LLM Configuration
# ==============================

llm = LLM(
    model=OPENROUTER_MODEL,
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

class StartupIdeaValidatorAgents:

    def web_search_agent(self):
        return Agent(
            role="Web Search Agent",
            goal="Collect verified market data, competitors, and industry insights.",
            backstory=(
                "You are responsible for gathering reliable real-time market "
                "information using Tavily and OpenRouter."
            ),
            tools=[web_search_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
        )

    def market_opportunity_agent(self):
        return Agent(
            role="Market Opportunity Agent",
            goal="Analyze market size, customer segments, TAM, SAM, SOM, and opportunities.",
            backstory=(
                "You evaluate market potential and customer demand using "
                "outputs from the web search agent."
            ),
            tools=[market_opportunity_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
        )

    def competitor_discovery_agent(self):
        return Agent(
            role="Competitor Discovery Agent",
            goal="Identify competitors and analyze their strengths and weaknesses.",
            backstory=(
                "You specialize in competitor intelligence and benchmarking."
            ),
            tools=[competitor_discovery_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
        )

    def comparison_agent(self):
        return Agent(
            role="Comparison Agent",
            goal="Compare the startup idea with competitors and generate strategic insights.",
            backstory=(
                "You compare startup ideas with competitors and provide recommendations."
            ),
            tools=[comparison_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
        )