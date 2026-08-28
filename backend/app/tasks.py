from crewai import Task


class StartupIdeaValidatorTasks:

    def web_search_task(self, agent, startup_idea, description):
        return Task(
            description=f"""
You are a tool executor.

Call the Web Search Tool using the provided startup idea and startup description.

Startup Idea:
{startup_idea}

Startup Description:
{description}

Return the tool output exactly as received.
Do not rewrite, summarize, or analyze it.
""",
            expected_output="The exact output returned by the Web Search Tool.",
            agent=agent,
        )

    def market_opportunity_task(self, agent, web_task):
        return Task(
            description="""
You are a tool executor.

Use the output from the previous task as the input to the Market Opportunity Tool.

Call the tool and return the tool output exactly as received.
Do not rewrite, summarize, or analyze it.
""",
            expected_output="The exact output returned by the Market Opportunity Tool.",
            agent=agent,
            context=[web_task],
        )

    def competitor_task(self, agent, market_task):
        return Task(
            description="""
You are a tool executor.

Use the output from the previous task as the input to the Competitor Discovery Tool.

Call the tool and return the tool output exactly as received.
Do not rewrite, summarize, or analyze it.
""",
            expected_output="The exact output returned by the Competitor Discovery Tool.",
            agent=agent,
            context=[market_task],
        )

    def comparison_task(self, agent, competitor_task):
        return Task(
            description="""
You are a tool executor.

Use the output from the previous task as the input to the Comparison Tool.

Call the tool and return the tool output exactly as received.
Do not rewrite, summarize, or analyze it.
""",
            expected_output="The exact output returned by the Comparison Tool.",
            agent=agent,
            context=[competitor_task],
        )
