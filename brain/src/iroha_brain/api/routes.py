from __future__ import annotations

import logging
from time import perf_counter

from fastapi import APIRouter

from iroha_brain.core.config import settings
from iroha_brain.models.schemas import BrainResponse, ChatEvent
from iroha_brain.services.ollama_client import OllamaClient

router = APIRouter()
log = logging.getLogger("brain.api")

_ollama = OllamaClient(str(settings.ollama_url), settings.ollama_model)


def _quick_emotion_heuristic(text: str) -> tuple[str, float]:
    t = text.lower()
    if "!" in text:
        return ("excited", 0.7)
    if any(w in t for w in ["sorry", "can't", "cannot", "won't"]):
        return ("apologetic", 0.4)
    if any(w in t for w in ["lol", "lmao", "haha"]):
        return ("playful", 0.6)
    return ("neutral", 0.35)

MAX_REPLY_CHARS = 120
FALLBACK_REPLY = "I blanked. Ask me again!"

def _normalize_reply(raw: str) -> str:
    text = " ".join(raw.replace("\r", " ").replace("\n", " ").split()).strip()

    if not text:
        return FALLBACK_REPLY
    
    if (len(text) > MAX_REPLY_CHARS):
        text = text[:MAX_REPLY_CHARS].rstrip()

    return text


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.post("/generate", response_model=BrainResponse)
async def generate(evt: ChatEvent) -> BrainResponse:
    started = perf_counter()
    outcome = "ok"
    should_speak = False
    ollama_latency_ms: float | None = None

    prompt = (
        "You are Iroha, an AI VTuber.\n"
        "Return plain text only.\n"
        "Reply in exactly ONE short sentence, max 120 characters\n"
        "No emojis, no markdown, no lists, no extra commentary, no line breaks\n"
        f"Chat from {evt.username}: {evt.message}\n"
        "Iroha reply:"
    )

    log.info(
        "generate_request",
        extra={"extra": {"user_id": evt.user_id, "username": evt.username, "len": len(evt.message)}},
    )

    try:
        ollama_started = perf_counter()
        
        reply_raw = await _ollama.generate(
            prompt,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
        )

        ollama_latency_ms = round((perf_counter() - ollama_started) * 1000, 2)
        log.info(
            "generate_ollama_latency",
            extra={"extra": {"ollama_latency_ms": ollama_latency_ms, "outcome": "ok"}},
        )

        reply = _normalize_reply(reply_raw)

        emotion, intensity = _quick_emotion_heuristic(reply)
        resp = BrainResponse(
            reply_text=reply,
            should_speak=True,
            emotion=emotion,
            intensity=float(intensity),
            safe=True,
            refusal_reason=None,
        )
        should_speak = resp.should_speak

    except Exception:
        outcome = "ollama_error"
        log.exception("ollama_error")
        resp = BrainResponse(
            reply_text="Brain is having an error, try again",
            should_speak=False,
            emotion="neutral",
            intensity=0.0,
            safe=True,
            refusal_reason=None,
        )
        should_speak = resp.should_speak
    finally:
        latency_ms = round((perf_counter() - started) * 1000, 2)
        log.info(
            "generate_latency",
            extra={
                "extra": {
                    "latency_ms": latency_ms,
                    "ollama_latency_ms": ollama_latency_ms,
                    "outcome": outcome,
                    "should_speak": should_speak,
                }
            }
        )

    log.info(
        "generate_response",
        extra={"extra": {"emotion": resp.emotion, "intensity": resp.intensity, "chars": len(resp.reply_text)}},
    )
    return resp
