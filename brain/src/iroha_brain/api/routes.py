from __future__ import annotations

import logging

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


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.post("/generate", response_model=BrainResponse)
def generate(evt: ChatEvent) -> BrainResponse:
    prompt = (
        "You are Iroha, an AI VTuber.\n"
        "Reply in ONE short sentence. No emojis. No extra commentary.\n"
        f"Chat from {evt.username}: {evt.message}\n"
        "Iroha reply:"
    )

    log.info(
        "generate_request",
        extra={"extra": {"user_id": evt.user_id, "username": evt.username, "len": len(evt.message)}},
    )

    try:
        reply = _ollama.generate(
            prompt,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
        )
    except Exception:
        log.exception("ollama_error")
        return BrainResponse(
            reply_text="(brain error) I glitched. Try again.",
            should_speak=False,
            emotion="neutral",
            intensity=0.0,
            safe=True,
            refusal_reason=None,
        )

    emotion, intensity = _quick_emotion_heuristic(reply)

    resp = BrainResponse(
        reply_text=reply,
        should_speak=True,
        emotion=emotion,
        intensity=float(intensity),
        safe=True,
        refusal_reason=None,
    )

    log.info(
        "generate_response",
        extra={"extra": {"emotion": resp.emotion, "intensity": resp.intensity, "chars": len(resp.reply_text)}},
    )
    return resp