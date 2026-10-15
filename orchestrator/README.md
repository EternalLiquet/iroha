# Iroha Orchestrator (Node + TypeScript)

The orchestrator runs real-time flow control in demo mode:

- validate incoming chat event shape
- consume chat events through a `ChatSource` boundary
- run decider logic (respond or skip)
- call brain `/generate`
- validate brain response shape

## Run

```powershell
cd n:\Personal\Other\iroha\orchestrator
npm install
npm run demo
```

## Tests

```powershell
npm run test
npm run test:watch
```

## Decider behavior

Current decider applies three gates:

- minimum message length
- cooldown window between responses
- response probability

### Env config

Copy `.env.example` to `.env` and tune values:

- `BRAIN_URL` (default: `http://127.0.0.1:8001`)
- `BRAIN_TIMEOUT_MS` (default: `30000`; positive integer milliseconds, maximum `2147483647`). The deadline covers connecting and reading the full response body. A timeout aborts the request and logs a failed brain call; the orchestrator then processes the next chat event. Failed calls do not start the response cooldown and are not retried automatically.
- `DECIDER_COOLDOWN_MS` (default: `6000`)
- `DECIDER_MIN_MESSAGE_CHARS` (default: `3`)
- `DECIDER_RESPOND_PROBABILITY` (default: `0.6`, clamped to `0..1`)

## Chat sources

Current demo mode uses `DemoChatSource`.

Live integrations should implement the same `ChatSource` interface instead of
adding platform-specific logic directly to the orchestration loop.

## Notes

- Runtime schema validation is intentionally strict.
- If decider says “skip”, orchestrator does not call brain.
- Current mode is local demo iteration; integrations are phased in separately.
