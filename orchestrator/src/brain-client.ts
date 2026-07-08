import {
  BrainGenerateRequestSchema,
  BrainResponseSchema,
  type BrainGenerateRequest,
  type BrainResponse,
  type ChatEvent,
} from "@iroha/shared-schema";

export interface BrainClient {
  generate(requestId: string, event: ChatEvent): Promise<BrainResponse>;
}

export class HttpBrainClient implements BrainClient {
  private readonly generateUrl: string;

  constructor(
    brainUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.generateUrl = `${brainUrl.replace(/\/$/, "")}/generate`;
  }

  async generate(requestId: string, event: ChatEvent): Promise<BrainResponse> {
    const request: BrainGenerateRequest = BrainGenerateRequestSchema.parse({
      request_id: requestId,
      ...event,
    });

    const response = await this.fetchImpl(this.generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(
        `Brain /generate failed: ${response.status} ${response.statusText} - ${bodyText}`,
      );
    }

    const payload: unknown = await response.json();
    return BrainResponseSchema.parse(payload);
  }
}
