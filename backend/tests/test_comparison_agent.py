from fastapi.testclient import TestClient

import comparison_agent


def test_comparison_endpoint_returns_success_payload():
    client = TestClient(comparison_agent.app)
    payload = {
        "startupIdea": "AI resume coach",
        "description": "An AI platform that helps job seekers improve resumes and interview prep.",
        "industry": "HR Tech",
        "competitors": [
            {
                "name": "Resume Worded",
                "website": "https://resumeworded.com",
                "description": "Resume optimization platform",
                "key_features": ["AI Resume Writing", "Resume Feedback"],
                "target_customers": "Job seekers",
                "pricing": "$19/month",
                "source": "manual",
            }
        ],
    }

    response = client.post("/api/comparison-agent", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["startup"] == payload["startupIdea"]
    assert body["industry"] == payload["industry"]
    assert isinstance(body["startup_features"], list)
    assert isinstance(body["feature_comparison"], list)
    assert isinstance(body["similarity_scores"], list)
    assert isinstance(body["market_gaps"], list)
    assert isinstance(body["business_insights"], dict)


def test_comparison_endpoint_accepts_optional_competitor_fields():
    client = TestClient(comparison_agent.app)
    payload = {
        "startupIdea": "AI resume coach",
        "description": "An AI platform that helps job seekers improve resumes and interview prep.",
        "industry": "HR Tech",
        "competitors": [
            {
                "name": "Resume Worded",
                "website": None,
                "description": "",
                "key_features": None,
                "target_customers": None,
                "pricing": None,
                "source": None,
            },
            None,
        ],
    }

    response = client.post("/api/comparison-agent", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert isinstance(body["feature_comparison"], list)
