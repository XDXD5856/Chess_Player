import type { BoardState, PieceCode } from "./board_state.js";

function emptySquares(): Record<string, PieceCode | null> {
  const squares: Record<string, PieceCode | null> = {};
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  for (let rank = 1; rank <= 8; rank += 1) {
    for (const file of files) squares[`${file}${rank}`] = null;
  }
  return squares;
}

export function initialBoardState(): BoardState {
  const squares = emptySquares();

  squares.a1 = "wr"; squares.b1 = "wn"; squares.c1 = "wb"; squares.d1 = "wq"; squares.e1 = "wk"; squares.f1 = "wb"; squares.g1 = "wn"; squares.h1 = "wr";
  squares.a2 = "wp"; squares.b2 = "wp"; squares.c2 = "wp"; squares.d2 = "wp"; squares.e2 = "wp"; squares.f2 = "wp"; squares.g2 = "wp"; squares.h2 = "wp";

  squares.a8 = "br"; squares.b8 = "bn"; squares.c8 = "bb"; squares.d8 = "bq"; squares.e8 = "bk"; squares.f8 = "bb"; squares.g8 = "bn"; squares.h8 = "br";
  squares.a7 = "bp"; squares.b7 = "bp"; squares.c7 = "bp"; squares.d7 = "bp"; squares.e7 = "bp"; squares.f7 = "bp"; squares.g7 = "bp"; squares.h7 = "bp";

  return {
    squares,
    sideToMove: "w",
    castling: "KQkq",
    enPassant: "-",
    halfmove: 0,
    fullmove: 1,
  };
}
