from crewai import Task


class StartupIdeaValidatorTasks:

    def web_search_task(self, agent, startup_idea):
        return Task(
            description=f"""
            Perform detailed market research for the startup idea:
            {startup_idea}

            Find:
            - Market size
            - Industry
            - Real competitors
            - Market trends
            """,
            expected_output="Structured market research data",
            agent=agent,
        )

    def market_opportunity_task(self, agent):
        return Task(
            description="""
            Analyze the market opportunity using the
            output of the Web Search Agent.

            Generate:
            - TAM
            - SAM
            - SOM
            - Customer Segments
            - Recommendations
            """,
            expected_output="Market opportunity report",
            agent=agent,
        )

    def competitor_task(self, agent):
        return Task(
            description="""
            Identify competitors and collect:
            - Features
            - Pricing
            - Target Customers
            - Websites
            """,
            expected_output="Competitor analysis report",
            agent=agent,
        )

    def comparison_task(self, agent):
        return Task(
            description="""
            Compare the startup with competitors.

            Generate:
            - Strengths
            - Weaknesses
            - Opportunities
            - Recommendations
            - Similarity Score
            """,
            expected_output="Final startup validation report",
            agent=agent,
        )