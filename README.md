# Chess Project (Stage 1 + Stage 2 Polish)

## 30-second Quick Start (Ubuntu)
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
sudo apt-get install -y stockfish
export CHESS_STOCKFISH_PATH=/usr/games/stockfish
python scripts/stage2_run_server.py
```
Then open: `http://127.0.0.1:8000`

## What is implemented now
- Stage 1 engine API:
  - `GET /health`
  - `POST /api/engine/move`
  - `POST /api/engine/analyze`
- Stage 2 one-page GUI:
  - human vs human
  - human vs engine
  - engine vs engine batch
  - stop engine-vs-engine series
  - legal move highlighting
  - PGN export for current game
- Stage 3: **not implemented** (returns explicit `501` unfinished response)

## GUI usage (exact)
Right panel has 3 sections:
1. **Mode selector**: choose `human_vs_human`, `human_vs_engine`, `engine_vs_engine`
2. **Engine settings**:
   - white/black engine path
   - think time
   - game count (for engine-vs-engine)
3. **Controls and output**:
   - Start / Reset / Stop / Export PGN
   - side to move, move history, current FEN, result, PGN
   - engine-vs-engine series progress and totals

### Engine path default logic
- If input is empty, backend uses `CHESS_STOCKFISH_PATH`.
- If input is provided, backend uses your value.

### Fast play recommendation
If you only want a quick trial:
- keep both engine path fields empty
- set `CHESS_STOCKFISH_PATH=/usr/games/stockfish`
- choose `human_vs_engine`
- set think time to `0.1`
- click Start

## API summary
### Engine
- `POST /api/engine/move`
- `POST /api/engine/analyze`

### Game
- `POST /api/game/create`
- `POST /api/game/move`
- `POST /api/game/legal-moves`
- `POST /api/game/engine-turn`
- `POST /api/game/engine-vs-engine/start`
- `GET /api/game/engine-vs-engine/status/{series_id}`
- `POST /api/game/engine-vs-engine/stop`

### Stage 3 (explicitly unfinished)
- `GET /api/stage3/recognize` -> `501`

## Known limitations
- GUI is intentionally simple (no animation, no opening book, no persisted state)
- Engine-vs-engine series runs in-process (not distributed)
- No board recognition / no automation gameplay
