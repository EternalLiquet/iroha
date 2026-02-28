# Iroha Runbook (Local Dev)

## Brain service

Start:

```
cd n:\Personal\Other\iroha\brain
python -m uvicorn iroha_brain.main:app --host 127.0.0.1 --port 8001
```

Health check:

```
curl.exe -v --max-time 5 http://127.0.0.1:8001/health
```

## Ollama checks

```
curl.exe http://127.0.0.1:11434/api/tags
```

## If requests hang

1. Confirm port listener:

```
netstat -ano | findstr :8001
```

2. Kill stale PID:

```
taskkill /PID <pid> /F
```

3. Restart service.

## Expected latency logs

- `generate_ollama_latency` → model call only
- `generate_latency` → full API request

Use both together when diagnosing slow responses.
