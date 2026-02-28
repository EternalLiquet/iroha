# Iroha Brain (FastAPI)

The Brain service receives chat events and returns a strictly structured response for the orchestrator.

## Responsibilities

- Validate incoming chat payloads
- Generate short responses via local Ollama
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

- request event
- Ollama sub-latency
- total request latency
- response metadata

## Notes

If localhost requests hang, check for stale processes bound to port 8001.
