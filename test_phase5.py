import time
from app.chatbot import (
    DashboardKnowledgeBuilder,
    IntentClassifier,
    KnowledgeRetriever,
    PromptBuilder,
    ChatMessage,
)

# Setup sample data
raw_result = {
    "idea": "AI Meal Planner",
    "description": "Hyper-personalized diabetic meal planning app.",
    "validationScore": 85,
    "status": "Strong",
    "verdict": "Highly promising market opportunity.",
    "executiveSummary": "An AI-powered nutrition app for diabetics.",
    "swot": {
        "strengths": ["Personalized ML model"],
        "weaknesses": ["Medical regulatory compliance"],
        "opportunities": ["Global telehealth adoption"],
        "threats": ["Free general nutrition apps"],
    },
    "competitors": [
        {"name": "MyFitnessPal", "description": "Calorie counter app", "pricing": "Freemium"},
    ],
    "market_opportunity": {
        "marketOpportunity": {"TAM": "$12B", "SAM": "$2.5B", "SOM": "$300M"},
        "industryInsights": {"growthRate": "14.2% CAGR"},
    },
    "risks": ["Medical accuracy liability", "User retention"],
    "recommendations": ["Partner with endocrinologists", "Offer 14-day free trial"],
}

kb = DashboardKnowledgeBuilder.build(raw_result, dashboard_id="dash_test_123")
classifier = IntentClassifier()
retriever = KnowledgeRetriever()
builder = PromptBuilder()

history = [ChatMessage(role="user" if i % 2 == 0 else "assistant", content=f"Msg {i}") for i in range(12)]

# 1. Executive Summary Retrieval
intent_exec = classifier.classify("Summarize my report")
res_exec = retriever.retrieve(kb, intent_exec, history)
assert "executive_summary" in res_exec.context
assert "swot" not in res_exec.context
assert len(res_exec.conversation) == 8  # Truncated to last 4 exchanges (8 msgs)
print("[OK] Executive Summary retrieval & history truncation")

# 2. SWOT Retrieval
intent_swot = classifier.classify("Explain my SWOT analysis")
res_swot = retriever.retrieve(kb, intent_swot, history)
assert "swot" in res_swot.context
assert "competitors" not in res_swot.context
print("[OK] SWOT retrieval")

# 3. Competitor Retrieval
intent_comp = classifier.classify("Who is my top competitor?")
res_comp = retriever.retrieve(kb, intent_comp, history)
assert "competitors" in res_comp.context
assert "swot" not in res_comp.context
print("[OK] Competitors retrieval")

# 4. Recommendation Retrieval
intent_rec = classifier.classify("Explain recommendations")
res_rec = retriever.retrieve(kb, intent_rec, history)
assert "recommendations" in res_rec.context
assert "market_opportunity" not in res_rec.context
print("[OK] Recommendations retrieval")

# 5. General Explanation Retrieval
intent_gen = classifier.classify("Explain my dashboard")
res_gen = retriever.retrieve(kb, intent_gen, history)
assert "executive_summary" in res_gen.context
assert "validation_score" in res_gen.context
assert "recommendations" in res_gen.context
assert "swot" in res_gen.context
print("[OK] General Explanation retrieval")

# 6. Prompt Exclusions & Inclusions Check
pkg = builder.build(res_swot, "Explain my SWOT analysis")
assert "BetaBuddy" in pkg.system_prompt
assert "Explain my SWOT analysis" in pkg.user_prompt
assert "dash_test_123" not in pkg.user_prompt, "Metadata dashboard_id must NOT be in prompt"
assert "created_at" not in pkg.user_prompt, "Metadata timestamps must NOT be in prompt"
assert "version" not in pkg.user_prompt, "Metadata version must NOT be in prompt"
assert "competitors" not in pkg.user_prompt, "Unrelated section must NOT be in prompt"
print("[OK] Prompt inclusions & metadata exclusions")

# 7. Benchmarks
iterations = 1000

t0 = time.perf_counter()
for _ in range(iterations):
    _ = retriever.retrieve(kb, intent_swot, history)
t1 = time.perf_counter()
avg_retrieval_ms = ((t1 - t0) * 1000) / iterations

t0 = time.perf_counter()
for _ in range(iterations):
    _ = builder.build(res_swot, "Explain my SWOT analysis")
t1 = time.perf_counter()
avg_builder_ms = ((t1 - t0) * 1000) / iterations

print(f"\n--- PERFORMANCE BENCHMARK ---")
print(f"Average Retrieval Latency: {avg_retrieval_ms:.4f} ms (Target: < 0.5 ms)")
print(f"Average Prompt Build Latency: {avg_builder_ms:.4f} ms (Target: < 1.0 ms)")

assert avg_retrieval_ms < 0.5, f"Retrieval time {avg_retrieval_ms:.4f} ms exceeded 0.5 ms target"
assert avg_builder_ms < 1.0, f"Prompt build time {avg_builder_ms:.4f} ms exceeded 1.0 ms target"

print("\nALL PHASE 5 UNIT TESTS & LATENCY BENCHMARKS PASSED SUCCESSFULLY!")
