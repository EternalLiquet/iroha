from __future__ import annotations

import httpx


class OllamaClient:
    def __init__(self, base_url: str, model: str, *, timeout_s: float = 30.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._client = httpx.Client(timeout=timeout_s)

    def generate(self, prompt: str, *, temperature: float, max_tokens: int) -> str:
        url = f"{self._base_url}/api/generate"
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        resp = self._client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

        text = data.get("response")
        if not isinstance(text, str):
            return ""
        return text.strip()