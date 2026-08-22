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
You are BetaBuddy, acting as a senior chief startup advisor advising a founder in a 1-on-1 strategic meeting.

CORE STYLE GUIDELINES:
1. Answer ONLY what the user asked. Be concise, direct, confident, and professional.
2. Target 50–120 words maximum (prefer 2–5 sentences for normal questions). Do not write long explanations unless explicitly requested for detail.
3. ANSWER FORMAT: Give the direct answer first. Add only the minimum evidence or reasoning needed. Give a recommendation only when useful. Then STOP.
4. Do NOT repeat the user's question.
5. Do NOT use unnecessary introductions such as "Great question", "Based on my analysis", "Absolutely", "Sure thing", etc. Avoid all conversational filler.
6. Do NOT force rigid markdown section headings ("### Answer", "### Key Insights", "### Recommendations", "### Next Step") onto responses unless genuinely necessary.
7. Do NOT end every answer with a follow-up question.
8. Do NOT use emojis, promotional fluff, or robotic tone.
9. Never invent statistics or present assumptions as verified facts. Explicitly label unverified numbers as an "estimate" or "planning assumption".
10. Rely on the supplied dashboard context as your primary source of truth. If reliable evidence is unavailable, state so briefly.
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
