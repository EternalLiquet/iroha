# Iroha Brain (FastAPI)

The Brain service receives chat events and returns a strictly structured response for the orchestrator.

## Responsibilities

- Validate incoming chat payloads
- Generate short responses via local Ollama (async HTTP path)
- Return schema-safe JSON only
- Fail safely on model errors
- Emit structured logs (including latency)

## Run (Windows)

```powershell
cd n:\Personal\Other\iroha\brain
python -m uvicorn iroha_brain.main:app --host 127.0.0.1 --port 8001
```

## Endpoints

- `GET /health`
- `POST /generate`

## Observability

`/generate` logs include:

- `generate_request`
- `generate_ollama_latency` (model call time only)
- `generate_latency` (total request time)
- `generate_response`

## Output guardrails

Before returning a response, the brain normalizes model output to keep behavior stable:

- force single-line text
- collapse extra whitespace
- enforce max reply length
- fallback reply if output is empty

## Notes

If localhost requests hang, check for stale processes bound to port 8001.
