import {
  BrainGenerateRequestSchema,
  BrainResponseSchema,
  type BrainGenerateRequest,
  type BrainResponse,
  type ChatEvent,
} from "@iroha/shared-schema";
import { DEFAULT_BRAIN_TIMEOUT_MS, MAX_BRAIN_TIMEOUT_MS } from "./config";

export interface BrainClient {
  generate(requestId: string, event: ChatEvent): Promise<BrainResponse>;
}

export class HttpBrainClient implements BrainClient {
  private readonly generateUrl: string;

  constructor(
    brainUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = DEFAULT_BRAIN_TIMEOUT_MS,
  ) {
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > MAX_BRAIN_TIMEOUT_MS
    ) {
      throw new Error(
        `Brain timeout must be an integer from 1 to ${MAX_BRAIN_TIMEOUT_MS} milliseconds`,
      );
    }
    this.generateUrl = `${brainUrl.replace(/\/$/, "")}/generate`;
  }

  async generate(requestId: string, event: ChatEvent): Promise<BrainResponse> {
    const request: BrainGenerateRequest = BrainGenerateRequestSchema.parse({
      request_id: requestId,
      ...event,
    });

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const error = new Error(
          `Brain /generate timed out after ${this.timeoutMs} ms`,
        );
        reject(error);
        controller.abort(error);
      }, this.timeoutMs);
    });

    try {
      const operation = async (): Promise<BrainResponse> => {
        const response = await this.fetchImpl(this.generateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          throw new Error(
            `Brain /generate failed: ${response.status} ${response.statusText} - ${bodyText}`,
          );
        }

        const payload: unknown = await response.json();
        return BrainResponseSchema.parse(payload);
      };

      return await Promise.race([operation(), deadline]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
