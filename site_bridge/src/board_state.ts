export type PieceCode =
  | "wp"
  | "wn"
  | "wb"
  | "wr"
  | "wq"
  | "wk"
  | "bp"
  | "bn"
  | "bb"
  | "br"
  | "bq"
  | "bk";

export type BoardState = {
  squares: Record<string, PieceCode | null>;
  sideToMove: "w" | "b";
  castling: string;
  enPassant: string | "-";
  halfmove: number;
  fullmove: number;
};

export interface BoardStateAdapter {
  readState(): Promise<BoardState> | BoardState;
  applyMove?(uciMove: string): Promise<void> | void;
  onHumanMove?(cb: (uciMove: string) => void): void;
}
