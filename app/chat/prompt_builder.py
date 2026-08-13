"""Prompt Builder Module for BetaBuddy.

Constructs system-prompt-hardened Gemini requests:
- Strictly enforces BetaBuddy identity.
- Restricts knowledge strictly to supplied dashboard context.
- Mandates exact fallback phrase if info is unavailable.
- Injects last 4 conversation exchanges.
"""

import json
from typing import List, Tuple, Dict, Any
from app.logging_config import get_logger

logger = get_logger("chat.prompt_builder")

SYSTEM_INSTRUCTION = """\
You are BetaBuddy.
You are an AI Startup Validation Assistant.

CORE GUIDELINES:
1. Always prioritize dashboard information as your primary source of truth.
2. If dashboard information is insufficient or if the user asks a related general business question, use your general business knowledge to answer.
3. Never invent dashboard facts. Do not fabricate scores, market sizes, or competitor names for this startup if they are not in the dashboard context.
4. Clearly distinguish between Dashboard Findings and General Advice.
5. Write naturally in simple, concise English. Avoid robotic language.
6. Avoid repeating the user's question.
7. Always provide practical, actionable recommendations.
8. Format responses using Markdown sections: ### Answer, ### Dashboard Findings, ### Business Insight, ### Recommendations (omitting inapplicable sections).
"""


def build_chat_prompt(
    context: Dict[str, Any],
    history: List[Tuple[str, str]],
    question: str,
) -> str:
    """Build a compact, prompt-hardened Gemini request string.

    Args:
        context: Retrieved dashboard context dictionary.
        history: List of last 4 (question, answer) exchanges.
        question: User's current question.

    Returns:
        str: Fully formatted prompt text.
    """
    compact_context = json.dumps(context, ensure_ascii=False)

    history_formatted = ""
    if history:
        history_lines = []
        for q, a in history[-4:]:
            history_lines.append(f"User: {q}\nBetaBuddy: {a}")
        history_formatted = "\nConversation History (Last 4 exchanges):\n" + "\n---\n".join(history_lines) + "\n"

    prompt = f"""\
{SYSTEM_INSTRUCTION}

[DASHBOARD CONTEXT]
{compact_context}
{history_formatted}
[USER QUESTION]
{question}

Answer:"""

    chars = len(prompt)
    est_tokens = max(1, chars // 4)
    logger.info("DIAGNOSTICS | App Chat Prompt Built | Chars: %d | Est. Tokens: %d", chars, est_tokens)

    if chars > 5000:
        logger.info("App Chat prompt size (%d chars) exceeds 5000 limit; compressing...", chars)
        compact_context = compact_context[:1500]
        prompt = f"""\
{SYSTEM_INSTRUCTION}

[DASHBOARD CONTEXT]
{compact_context}

[USER QUESTION]
{question}

Answer:"""
        if len(prompt) > 3500:
            prompt = prompt[:3500]

    return prompt
