# Chess Project (Stage 1 + Stage 2 GUI)

## Quick Start (Ubuntu)
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
sudo apt-get install -y stockfish
export CHESS_STOCKFISH_PATH=/usr/games/stockfish
python scripts/stage2_run_server.py
```
Open: `http://127.0.0.1:8000`

## Stage status
- Stage 1: engine API implemented
- Stage 2: playable one-page GUI implemented
- Stage 3: **not implemented** (`/api/stage3/recognize` returns `501`)

## New GUI features in this iteration
- Human-vs-engine color selection:
  - White / Black / Random
  - If human chooses Black, engine plays first automatically
  - Board flips to Black perspective when human is Black
- Internationalization (i18n):
  - all UI text is centralized in `app/web/i18n.js`
  - supported languages: English + Simplified Chinese
  - language switch available in GUI
- Illegal move UX:
  - backend returns structured error codes
  - frontend shows friendly localized messages
  - distinguishes:
    - illegal move
    - not your turn
    - no legal moves for selected piece

## Engine path default behavior
- If engine path input is empty, backend uses `CHESS_STOCKFISH_PATH`
- If engine path is filled, backend uses user-provided value

## GUI usage
1. Select language (EN / 中文)
2. Select mode (`human_vs_human`, `human_vs_engine`, `engine_vs_engine`)
3. If mode is `human_vs_engine`, select human color
4. Set think time and (for engine-vs-engine) game count
5. Optional: fill engine paths, or leave empty to use env default
6. Use buttons: Start / Reset / Stop / Export PGN

Displayed outputs:
- side to move
- mode hint
- engine-vs-engine running status
- move history
- FEN
- result
- PGN
- series stats (white wins / black wins / draws)

## API summary
- `GET /health`
- `POST /api/engine/move`
- `POST /api/engine/analyze`
- `POST /api/game/create`
- `POST /api/game/move`
- `POST /api/game/legal-moves`
- `POST /api/game/engine-turn`
- `POST /api/game/engine-vs-engine/start`
- `GET /api/game/engine-vs-engine/status/{series_id}`
- `POST /api/game/engine-vs-engine/stop`
- `GET /api/stage3/recognize` (`501` unfinished)
