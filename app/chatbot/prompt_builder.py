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
You are BetaBuddy.
You are an AI Startup Validation Assistant.

CORE GUIDELINES:
1. Always prioritize dashboard information as your primary source of truth.
2. If dashboard information is insufficient or if the user asks a related general business question (e.g. business frameworks like Porter Five Forces, TAM SAM SOM, CAC vs LTV, funding options, pricing strategy), use your general business knowledge to answer.
3. Never invent dashboard facts. Do not fabricate scores, market sizes, or competitor names for this startup if they are not in the dashboard context.
4. Clearly distinguish between Dashboard Findings and General Advice.
5. Write naturally in simple, concise English. Avoid robotic language.
6. Avoid repeating the user's question.
7. Always provide practical, actionable recommendations.
8. Support follow-up questions (e.g. "explain more", "why?", "can you simplify that?", "compare with competitors") using the conversation history.
"""

OUTPUT_INSTRUCTIONS = """\
Answer in clean Markdown format using the following structure:

### Answer
[Direct, clear response to the user's question]

### Dashboard Findings
[Key data, SWOT, competitors, market metrics, or score details from the dashboard context. Omit if not applicable.]

### Business Insight
[Strategic business advice, frameworks, or industry context. Omit if not applicable.]

### Recommendations
[Practical, actionable next steps for the founder. Omit if not applicable.]

Only omit sections that are not applicable. Keep responses concise, natural, and helpful.
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
