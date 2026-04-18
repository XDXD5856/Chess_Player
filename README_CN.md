# 国际象棋项目（Stage 1 + Stage 2 收尾增强）

## 最短启动流程（Ubuntu）
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
sudo apt-get install -y stockfish
export CHESS_STOCKFISH_PATH=/usr/games/stockfish
python scripts/stage2_run_server.py
```
打开：`http://127.0.0.1:8000`

## 当前实现
- Stage 1 引擎 API：
  - `GET /health`
  - `POST /api/engine/move`
  - `POST /api/engine/analyze`
- Stage 2 单页 GUI：
  - 人人 / 人机 / 机机
  - 机机批量对战可停止
  - 合法步高亮
  - 当前对局 PGN 导出
- Stage 3：**未实现**（明确返回 `501`）

## GUI 使用说明（精确）
右侧分三块：
1. **模式选择**：`human_vs_human`、`human_vs_engine`、`engine_vs_engine`
2. **引擎参数**：白/黑引擎路径、思考时间、机机局数
3. **控制与信息**：开始/重开/停止/导出PGN，显示当前走子方、走子记录、FEN、结果、系列统计

### 默认引擎逻辑
- 输入框为空：自动使用 `CHESS_STOCKFISH_PATH`
- 输入框非空：使用用户填写路径

### 快速试玩建议
- 两个引擎路径都留空
- 设置 `CHESS_STOCKFISH_PATH=/usr/games/stockfish`
- 模式选 `human_vs_engine`
- 思考时间 `0.1`
- 点击“开始”

## API 列表
### 引擎接口
- `POST /api/engine/move`
- `POST /api/engine/analyze`

### 对局接口
- `POST /api/game/create`
- `POST /api/game/move`
- `POST /api/game/legal-moves`
- `POST /api/game/engine-turn`
- `POST /api/game/engine-vs-engine/start`
- `GET /api/game/engine-vs-engine/status/{series_id}`
- `POST /api/game/engine-vs-engine/stop`

### Stage 3（明确未完成）
- `GET /api/stage3/recognize` -> `501`

## 已知限制
- GUI 追求简洁，不含动画等复杂效果
- 机机对战为进程内批处理
- 不包含棋盘识别、自动游玩
