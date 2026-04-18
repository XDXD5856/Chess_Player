export interface EngineAnalyzeResponse {
  best_move: string | null;
  evaluation: string | null;
  principal_variation: string[];
}

export interface EngineRequestOptions {
  thinkTime?: number;
  enginePath?: string | null;
}

export class EngineClient {
  constructor(
    private readonly baseUrl: string =
      (globalThis as { SITE_BRIDGE_ENGINE_BASE_URL?: string }).SITE_BRIDGE_ENGINE_BASE_URL ??
      "http://127.0.0.1:8000",
  ) {}

  async bestMove(fen: string, options: EngineRequestOptions = {}): Promise<EngineAnalyzeResponse> {
    const payload = {
      fen,
      think_time: options.thinkTime ?? 0.1,
      engine_path: options.enginePath ?? undefined,
    };

    const res = await fetch(`${this.baseUrl}/api/engine/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail?.message ?? "Engine request failed");
    }

    return (await res.json()) as EngineAnalyzeResponse;
  }
}
