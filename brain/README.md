# iroha-brain

FastAPI service that accepts a ChatEvent and returns a strict BrainResponse.
Uses local Ollama for inference.

## Run

```bash
cd iroha/brain
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1

pip install -U pip
pip install -e ".[dev]"

cp .env.example .env

uvicorn brain.main:app --host 127.0.0.1 --port 8000
```
