export class EngineClient {
    baseUrl;
    constructor(baseUrl = globalThis.SITE_BRIDGE_ENGINE_BASE_URL ??
        "http://127.0.0.1:8000") {
        this.baseUrl = baseUrl;
    }
    async bestMove(fen, options = {}) {
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
        return (await res.json());
    }
}
