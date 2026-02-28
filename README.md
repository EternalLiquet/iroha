# Iroha

An AI-powered virtual YouTuber project built with Node and Python, split into separate apps with clear responsibilities, all in one monorepo.

## Why I'm making this

Hands-on experience designing an AI system/pipeline:

- real-time message flow
- service boundaries
- safety + validation
- latency + observability
- failure handling

## How it's split

Iroha is intentionally split into layers so each one has a single job:

- **Orchestrator (Node.js + TypeScript)**  
  Runs the real-time flow, decides when to respond, and coordinates outputs.

- **Brain (Python + FastAPI)**  
  Handles prompt logic, model calls, and returns structured responses.

- **Local LLM (Ollama / llama.cpp)**  
  Runs inference locally so behavior is testable and transparent.

- **Output layer (planned)**  
  Local TTS + avatar/expression control.
