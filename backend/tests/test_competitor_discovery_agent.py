import competitor_discovery_agent


def test_populate_competitor_websites_uses_search_results_and_null_for_unknown():
    payload = {
        "startupIdea": "AI resume coach",
        "industry": "HR Tech",
        "competitors": [
            {
                "name": "Resume Worded",
                "website": "",
                "description": "Resume optimization platform",
                "key_features": [],
                "target_customers": "Job seekers",
                "pricing": "$19/month",
                "source": "",
            },
            {
                "name": "Rezi",
                "website": "https://www.rezi.ai",
                "description": "AI resume builder",
                "key_features": [],
                "target_customers": "Job seekers",
                "pricing": "$29/month",
                "source": "",
            },
            {
                "name": "Unknown Rival",
                "website": "",
                "description": "No official site found",
                "key_features": [],
                "target_customers": "",
                "pricing": "",
                "source": "",
            },
        ],
    }

    search_results = [
        {"url": "https://resumeworded.com", "content": "Resume Worded official site"},
        {"url": "https://www.rezi.ai", "content": "Rezi official site"},
        {"url": "https://example.com/unknown-rival", "content": "Maybe a competitor"},
    ]

    output = competitor_discovery_agent._populate_competitor_websites(payload, search_results)

    assert output["competitors"][0]["website"] == "https://resumeworded.com"
    assert output["competitors"][1]["website"] == "https://www.rezi.ai"
    assert output["competitors"][2]["website"] is None
