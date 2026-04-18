function cloneSquares(squares) {
    return { ...squares };
}
function isWhite(piece) {
    return piece.startsWith("w");
}
function fileIndex(file) {
    return file.charCodeAt(0) - "a".charCodeAt(0);
}
function rankIndex(rank) {
    return Number(rank);
}
function square(file, rank) {
    return `${String.fromCharCode("a".charCodeAt(0) + file)}${rank}`;
}
function clearCastlingForRookMove(castling, from) {
    let next = castling;
    if (from === "a1")
        next = next.replace("Q", "");
    if (from === "h1")
        next = next.replace("K", "");
    if (from === "a8")
        next = next.replace("q", "");
    if (from === "h8")
        next = next.replace("k", "");
    return next || "-";
}
function clearCastlingForRookCapture(castling, to) {
    let next = castling;
    if (to === "a1")
        next = next.replace("Q", "");
    if (to === "h1")
        next = next.replace("K", "");
    if (to === "a8")
        next = next.replace("q", "");
    if (to === "h8")
        next = next.replace("k", "");
    return next || "-";
}
export function applyUciMove(state, uciMove) {
    if (uciMove.length < 4) {
        throw new Error(`Invalid UCI move: ${uciMove}`);
    }
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove[4];
    const nextSquares = cloneSquares(state.squares);
    const piece = nextSquares[from];
    if (!piece)
        throw new Error(`No piece on ${from}`);
    const targetBefore = nextSquares[to];
    let castling = state.castling === "-" ? "" : state.castling;
    // rook capture affects castling rights
    if (targetBefore && (targetBefore === "wr" || targetBefore === "br")) {
        castling = clearCastlingForRookCapture(castling, to);
    }
    // king move affects castling + rook movement for castling
    if (piece === "wk") {
        castling = castling.replace("K", "").replace("Q", "");
        if (from === "e1" && to === "g1") {
            nextSquares["h1"] = null;
            nextSquares["f1"] = "wr";
        }
        else if (from === "e1" && to === "c1") {
            nextSquares["a1"] = null;
            nextSquares["d1"] = "wr";
        }
    }
    if (piece === "bk") {
        castling = castling.replace("k", "").replace("q", "");
        if (from === "e8" && to === "g8") {
            nextSquares["h8"] = null;
            nextSquares["f8"] = "br";
        }
        else if (from === "e8" && to === "c8") {
            nextSquares["a8"] = null;
            nextSquares["d8"] = "br";
        }
    }
    if (piece === "wr" || piece === "br") {
        castling = clearCastlingForRookMove(castling, from);
    }
    // en passant capture
    if ((piece === "wp" || piece === "bp") && state.enPassant !== "-" && to === state.enPassant && !targetBefore) {
        const toFile = fileIndex(to[0]);
        const toRank = rankIndex(to[1]);
        const capturedRank = piece === "wp" ? toRank - 1 : toRank + 1;
        nextSquares[square(toFile, capturedRank)] = null;
    }
    nextSquares[from] = null;
    if (promotion && (piece === "wp" || piece === "bp")) {
        const prefix = isWhite(piece) ? "w" : "b";
        const map = {
            q: `${prefix}q`,
            r: `${prefix}r`,
            b: `${prefix}b`,
            n: `${prefix}n`,
        };
        nextSquares[to] = map[promotion.toLowerCase()] ?? `${prefix}q`;
    }
    else {
        nextSquares[to] = piece;
    }
    // en passant target square for next position
    let enPassant = "-";
    if (piece === "wp" || piece === "bp") {
        const fromRank = rankIndex(from[1]);
        const toRank = rankIndex(to[1]);
        if (Math.abs(toRank - fromRank) === 2) {
            const midRank = (fromRank + toRank) / 2;
            enPassant = `${from[0]}${midRank}`;
        }
    }
    const captureOrPawnMove = piece.endsWith("p") || Boolean(targetBefore);
    const halfmove = captureOrPawnMove ? 0 : state.halfmove + 1;
    const fullmove = state.sideToMove === "b" ? state.fullmove + 1 : state.fullmove;
    return {
        squares: nextSquares,
        sideToMove: state.sideToMove === "w" ? "b" : "w",
        castling: castling || "-",
        enPassant,
        halfmove,
        fullmove,
    };
}
