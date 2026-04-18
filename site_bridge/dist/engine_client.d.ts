export interface EngineAnalyzeResponse {
    best_move: string | null;
    evaluation: string | null;
    principal_variation: string[];
}
export interface EngineRequestOptions {
    thinkTime?: number;
    enginePath?: string | null;
}
export declare class EngineClient {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    bestMove(fen: string, options?: EngineRequestOptions): Promise<EngineAnalyzeResponse>;
}
