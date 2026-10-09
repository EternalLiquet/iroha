import "dotenv/config";
import { HttpBrainClient } from "./brain-client";
import { DemoChatSource } from "./chat-source";
import { loadBrainTimeoutMs, loadDeciderConfig } from "./config";
import { runOrchestrator } from "./orchestrator";

const BRAIN_URL = process.env.BRAIN_URL ?? "http://127.0.0.1:8001";

const brainClient = new HttpBrainClient(BRAIN_URL, fetch, loadBrainTimeoutMs());
const chatSource = new DemoChatSource();
const deciderConfig = loadDeciderConfig();

runOrchestrator({
  brainUrl: BRAIN_URL,
  brainClient,
  chatSource,
  deciderConfig,
  label: "demo",
}).catch((err) => {
  console.error("[orchestrator] fatal:", err);
  process.exitCode = 1;
});
