# Iroha Orchestrator (Node + TypeScript)

The orchestrator runs real-time flow control in demo mode:

- validate incoming chat event shape
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
- `DECIDER_COOLDOWN_MS` (default: `6000`)
- `DECIDER_MIN_MESSAGE_CHARS` (default: `3`)
- `DECIDER_RESPOND_PROBABILITY` (default: `0.6`, clamped to `0..1`)

## Notes

- Runtime schema validation is intentionally strict.
- If decider says “skip”, orchestrator does not call brain.
- Current mode is local demo iteration; integrations are phased in separately.
