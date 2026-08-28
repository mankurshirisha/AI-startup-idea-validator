# AI Startup Idea Validator

An AI-driven startup idea validation platform featuring multi-agent intelligence, executive dashboard analytics, client-side PDF reporting, and an interactive BetaBuddy chatbot assistant.

---

## Repository Structure

The project is structured into dedicated `frontend/` and `backend/` packages:

```text
AI-startup-idea-validator/
│
├── frontend/                               # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/                     # UI and executive dashboard components
│   │   ├── pages/                          # LandingPage, LoadingPage, ResultsDashboard
│   │   ├── utils/                          # Client-side PDF generator (generatePdfReport.ts)
│   │   └── types/                          # Dashboard & validation TypeScript models
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── backend/                                # FastAPI Multi-Agent Backend
│   ├── app/                                # Core application package
│   │   ├── chat/                           # Chat processing services
│   │   ├── chatbot/                        # BetaBuddy intelligence & retrieval engine
│   │   ├── main.py                         # FastAPI application entrypoint & routing
│   │   ├── orchestrator.py                 # Multi-agent validation orchestrator
│   │   ├── gemini_client.py                # Gemini LLM gateway & fallback handler
│   │   ├── semantic_cache.py               # In-memory & semantic response caching
│   │   ├── logging_config.py               # Structured logging
│   │   ├── config.py                       # Application environment configuration
│   │   └── models.py                       # Pydantic request/response schemas
│   ├── comparison_agent.py                 # Competitor comparison & benchmarking agent
│   ├── competitor_discovery_agent.py       # Live competitor search agent
│   ├── market_opportunity_agent.py         # TAM/SAM/SOM market sizing agent
│   ├── web_search_agent.py                 # Tavily live web research agent
│   ├── swot_risk_agent.py                  # SWOT & Risk evaluation microservice
│   ├── mvp_feature_recommendation_agent.py # MVP feature prioritization microservice
│   ├── go_to_market_strategy_agent.py      # Go-To-Market strategy microservice
│   ├── tests/                              # Pytest test suites
│   ├── requirements.txt                    # Backend dependencies
│   ├── runtime.txt                         # Python runtime definition (python-3.12.10)
│   └── start.py                            # Backend multi-process launcher
│
├── start.py                                # Root launcher forwarding to backend/start.py
├── requirements.txt                        # Root dependencies for cloud build compatibility
├── runtime.txt                             # Root runtime definition
├── README.md                               # Repository documentation
├── LICENSE                                 # MIT License
└── .gitignore                              # Git ignore rules
```

---

## Features

- **Multi-Agent Validation Pipeline**:
  - Live Web Search & Market Signals (Tavily)
  - TAM / SAM / SOM Market Sizing & Trend Analysis
  - Competitor Discovery & Strategic Benchmarking
  - SWOT Matrix & Multi-Dimensional Risk Analysis
  - Actionable MVP Feature Roadmap & GTM Strategy
- **Executive BI Dashboard**:
  - Color-coded gauge score & status pills
  - Interactive tabs & responsive layout
  - Zero-AI Client-side PDF Report Generation (`jspdf` + `jspdf-autotable`)
- **BetaBuddy AI Companion**:
  - Floating chatbot answering questions grounded in the current dashboard analysis
  - Sub-millisecond in-memory session persistence & fallback model resiliency

---

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory (or in `backend/`):
```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
LOG_LEVEL=INFO
```

Run the backend services:
```bash
# From repository root or backend folder:
python start.py
```
*(Runs main FastAPI on `http://127.0.0.1:8000` along with auxiliary agent services on ports `8903`, `8904`, and `8905`)*

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Deployment Configuration

- **Backend (Render)**:
  - **Repository**: `mankurshirisha/AI-startup-idea-validator`
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `python start.py`
  - *Both root execution and subfolder execution (`cd backend && python start.py`) are supported out-of-the-box.*

- **Frontend (Vercel)**:
  - **Root Directory**: `frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Environment Variable**: `VITE_API_URL=https://your-render-backend-url.onrender.com`

---

## Running Tests

```bash
cd backend
python -m pytest tests/
python test_phase10.py
python test_e2e_chatbot_suite.py
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
