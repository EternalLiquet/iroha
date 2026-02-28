from __future__ import annotations

from typing import Any

import httpx


class OllamaClient:
    def __init__(self, base_url: str, model: str, *, timeout_s: float = 60.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self.timeout_s = timeout_s

    async def generate(self, prompt: str, temperature: float, max_tokens: int) -> str:
        url = f"{self._base_url}/api/generate"
        payload: dict[str, Any] = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }

        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        text = data.get("response", "")
        if not isinstance(text, str):
            raise ValueError("Invalid Ollama response: 'response' must be a string")
        return text.strip()