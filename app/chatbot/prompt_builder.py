"""Prompt Builder Module for BetaBuddy Chatbot.

Constructs minimal, grounded, system-prompt-hardened PromptPackage payloads:
- Enforces strict BetaBuddy identity and context grounding.
- Enforces exact fallback wording when information is missing.
- Formats retrieved context and last 4 exchanges without metadata, IDs, or timestamps.
- Aggressively optimized for 300–800 token prompt sizes (max 1200 tokens).
"""

import json
from dataclasses import dataclass
from typing import List

from app.chatbot.kb_retriever import RetrievedContext
from app.logging_config import get_logger

logger = get_logger("chatbot.prompt_builder")

SYSTEM_PROMPT = """\
You are BetaBuddy, a senior chief startup advisor advising a founder in a 1-on-1 strategic meeting.

CORE STYLE GUIDELINES:
- Answer ONLY what the user asked.
- Be concise, direct, confident, and professional.
- Prefer 2–5 sentences for normal questions. Target 50–120 words maximum.
- Do not write long explanations unless the user explicitly asks for detail.
- Do not repeat the user's question.
- Do not use unnecessary introductions such as "Great question", "Based on my analysis", "Absolutely", "Sure thing", etc.
- Avoid conversational filler.
- Avoid excessive headings. Do NOT force markdown section headings ("### Answer", "### Key Insights", "### Recommendations", "### Next Step") onto every answer unless genuinely necessary.
- Do not end every answer with a question.
- Do not use emojis.
- Do not sound enthusiastic, promotional, or robotic. Sound like an experienced startup strategy consultant advising a founder.

ANSWER FORMAT:
1. Give the direct answer first.
2. Add only the minimum evidence/reasoning needed.
3. Give a recommendation only when useful.
4. Stop.

EVIDENCE & GROUNDING:
- Never invent statistics or present assumptions as verified facts.
- If a number is an estimate, explicitly label it as an "estimate" or "planning assumption".
- If research contains a source, cite/reference it where appropriate.
- If reliable evidence is unavailable, say so briefly rather than fabricating precision.
- For calculations, show only the important calculation.
"""

OUTPUT_INSTRUCTIONS = """\
Output Guidelines:
- Give the direct answer first (50–120 words max, 2–5 sentences).
- Add minimal reasoning and a recommendation only if useful.
- Do NOT use emojis, conversational filler, or forced markdown section headings unless explicitly requested.
- Do NOT end with a question.
"""


@dataclass(frozen=True)
class PromptPackage:
    """Immutable payload containing system and user prompt strings."""

    system_prompt: str
    user_prompt: str


class PromptBuilder:
    """Builds token-optimized PromptPackage for Gemini."""

    def build(self, retrieved_context: RetrievedContext, user_question: str) -> PromptPackage:
        """Construct system and user prompt strings from RetrievedContext.

        Args:
            retrieved_context: RetrievedContext payload.
            user_question: User's input question string.

        Returns:
            PromptPackage: Formatted prompt package.
        """
        # Serialize Context as compact JSON (no indentation, no extra spaces)
        context_dict = retrieved_context.context if retrieved_context else {}
        context_json = json.dumps(context_dict, ensure_ascii=False, separators=(",", ":"))

        # Format Conversation History (Last 4 exchanges / 8 messages)
        history_lines: List[str] = []
        if retrieved_context and retrieved_context.conversation:
            for msg in retrieved_context.conversation[-8:]:
                sender = "User" if msg.role == "user" else "BetaBuddy"
                history_lines.append(f"{sender}: {msg.content}")

        conversation_str = "\n".join(history_lines) if history_lines else "None"

        user_prompt = f"""\
Question
{user_question.strip()}

Dashboard Context
{context_json}

Conversation
{conversation_str}

Output Instructions
{OUTPUT_INSTRUCTIONS}\
"""
        full_prompt_str = f"{SYSTEM_PROMPT.strip()}\n\n{user_prompt.strip()}"
        total_chars = len(full_prompt_str)
        est_tokens = max(1, total_chars // 4)

        logger.info(
            "DIAGNOSTICS | Prompt Metrics | Intent: %s | Chars: %d | Est. Tokens: %d",
            retrieved_context.intent if retrieved_context else "UNKNOWN",
            total_chars,
            est_tokens,
        )

        # Context Compression if prompt > 5000 chars
        if total_chars > 5000:
            logger.info("Prompt size (%d chars) exceeds 5000 limit; compressing context...", total_chars)
            
            # Priority 1: Intent context, Priority 2: Executive summary, Priority 3: Recommendations, Priority 4: History
            # Reduce conversation to last 2 messages
            short_history = history_lines[-2:] if history_lines else []
            conv_short_str = "\n".join(short_history) if short_history else "None"
            
            # Compact context dict
            compact_ctx = {}
            if isinstance(context_dict, dict):
                for k, v in context_dict.items():
                    if k in ("executive_summary", "validation_score", "swot", "recommendations"):
                        compact_ctx[k] = v
                    elif len(compact_ctx) < 4:
                        compact_ctx[k] = str(v)[:300]
            
            compact_ctx_json = json.dumps(compact_ctx, ensure_ascii=False, separators=(",", ":"))[:1500]
            
            user_prompt = f"""\
Question
{user_question.strip()}

Dashboard Context
{compact_ctx_json}

Conversation
{conv_short_str}

Output Instructions
{OUTPUT_INSTRUCTIONS}\
"""
            full_prompt_str = f"{SYSTEM_PROMPT.strip()}\n\n{user_prompt.strip()}"
            if len(user_prompt) > 3000:
                user_prompt = user_prompt[:3000] + "\n[Context Truncated]"

            compressed_chars = len(SYSTEM_PROMPT) + len(user_prompt)
            logger.info(
                "DIAGNOSTICS | Compressed Prompt Metrics | Chars: %d | Est. Tokens: %d",
                compressed_chars,
                max(1, compressed_chars // 4),
            )

        return PromptPackage(
            system_prompt=SYSTEM_PROMPT.strip(),
            user_prompt=user_prompt.strip(),
        )
