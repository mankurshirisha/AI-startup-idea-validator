from crewai import Crew, Process

from app.agents import StartupIdeaValidatorAgents
from app.tasks import StartupIdeaValidatorTasks


class StartupIdeaValidatorCrew:

    def run(self, startup_idea: str):

        agents = StartupIdeaValidatorAgents()
        tasks = StartupIdeaValidatorTasks()

        # Agents
        web_agent = agents.web_search_agent()
        market_agent = agents.market_opportunity_agent()
        competitor_agent = agents.competitor_discovery_agent()
        comparison_agent = agents.comparison_agent()

        # Tasks
        web_task = tasks.web_search_task(web_agent, startup_idea)
        market_task = tasks.market_opportunity_task(market_agent)
        competitor_task = tasks.competitor_task(competitor_agent)
        comparison_task = tasks.comparison_task(comparison_agent)

        # Crew
        crew = Crew(
            agents=[
                web_agent,
                market_agent,
                competitor_agent,
                comparison_agent,
            ],
            tasks=[
                web_task,
                market_task,
                competitor_task,
                comparison_task,
            ],
            process=Process.sequential,
            verbose=True,
        )

        result = crew.kickoff()

        return result