import type { BoardState, PieceCode } from "./board_state.js";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const pieceToFen: Record<PieceCode, string> = {
  wp: "P",
  wn: "N",
  wb: "B",
  wr: "R",
  wq: "Q",
  wk: "K",
  bp: "p",
  bn: "n",
  bb: "b",
  br: "r",
  bq: "q",
  bk: "k",
};

export function boardStateToFen(state: BoardState): string {
  const rows: string[] = [];

  for (let rank = 8; rank >= 1; rank -= 1) {
    let row = "";
    let empty = 0;

    for (const file of files) {
      const square = `${file}${rank}`;
      const piece = state.squares[square];

      if (!piece) {
        empty += 1;
        continue;
      }

      if (empty > 0) {
        row += String(empty);
        empty = 0;
      }

      row += pieceToFen[piece];
    }

    if (empty > 0) row += String(empty);
    rows.push(row);
  }

  const castling = state.castling?.trim() || "-";
  const enPassant = state.enPassant?.trim() || "-";

  return `${rows.join("/")} ${state.sideToMove} ${castling} ${enPassant} ${state.halfmove} ${state.fullmove}`;
}
