import "dotenv/config";
import { BrainResponseSchema, ChatEventSchema, type ChatEvent } from "./schema";

const BRAIN_URL = process.env.BRAIN_URL ?? "http://127.0.0.1:8000";

function nowMs(): number {
  return Date.now();
}

async function main() {
  const event: ChatEvent = ChatEventSchema.parse({
    user_id: process.env.DEMO_USER_ID ?? "demo-1",
    username: process.env.DEMO_USERNAME ?? "demo",
    message: process.env.DEMO_MESSAGE ?? "Hello!",
    timestamp_ms: nowMs(),
  });

  const res = await fetch(`${BRAIN_URL}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`[orchestrator] brain HTTP ${res.status}: ${text}`);
    process.exitCode = 1;
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("[orchestrator] brain did not return valid JSON:", text);
    process.exitCode = 1;
    return;
  }

  const parsed = BrainResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      "[orchestrator] schema validation failed:",
      parsed.error.flatten(),
    );
    console.error("[orchestrator] raw:", json);
    process.exitCode = 1;
    return;
  }

  console.log("[orchestrator] validated brain response:", parsed.data);
}

main().catch((err) => {
  console.error("[orchestrator] fatal:", err);
  process.exitCode = 1;
});
