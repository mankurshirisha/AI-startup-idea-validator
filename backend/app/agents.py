from crewai import LLM, Agent

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.tools import (comparison_tool, competitor_discovery_tool,
                       market_opportunity_tool, web_search_tool)

# ==========================================================
# Gemini LLM
# Used ONLY for tool orchestration.
# All business logic happens inside the FastAPI agents.
# ==========================================================

llm = LLM(
    model=f"gemini/{GEMINI_MODEL}",
    api_key=GEMINI_API_KEY,
    temperature=0,
)


class StartupIdeaValidatorAgents:

    # ======================================================
    # WEB SEARCH
    # ======================================================

    def web_search_agent(self):
        return Agent(
            role="Web Search Tool Executor",
            goal="Call the Web Search Tool and return its output exactly.",
            backstory=(
                "You are a tool executor. "
                "Never analyze or rewrite anything. "
                "Simply call the Web Search Tool."
            ),
            tools=[web_search_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1,
        )

    # ======================================================
    # MARKET OPPORTUNITY
    # ======================================================

    def market_opportunity_agent(self):
        return Agent(
            role="Market Opportunity Tool Executor",
            goal="Call the Market Opportunity Tool and return its output exactly.",
            backstory=("You are a tool executor. " "Never analyze anything yourself."),
            tools=[market_opportunity_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1,
        )

    # ======================================================
    # COMPETITOR DISCOVERY
    # ======================================================

    def competitor_discovery_agent(self):
        return Agent(
            role="Competitor Discovery Tool Executor",
            goal="Call the Competitor Discovery Tool and return its output exactly.",
            backstory=("You only invoke the Competitor Discovery Tool."),
            tools=[competitor_discovery_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1,
        )

    # ======================================================
    # COMPARISON
    # ======================================================

    def comparison_agent(self):
        return Agent(
            role="Comparison Tool Executor",
            goal="Call the Comparison Tool and return its output exactly.",
            backstory=(
                "You never compare startups yourself. "
                "Only execute the Comparison Tool."
            ),
            tools=[comparison_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1,
        )
