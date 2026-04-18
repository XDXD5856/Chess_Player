# 国际象棋项目（Stage 1 + Stage 2 GUI）

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

## 阶段状态
- Stage 1：引擎 API 已实现
- Stage 2：单页可玩 GUI 已实现
- Stage 3：**未实现**（`/api/stage3/recognize` 返回 `501`）

## 本轮新增重点
- 人机执子颜色选择：
  - 白 / 黑 / 随机
  - 人类选黑时，引擎自动先走
  - 人类选黑时，棋盘自动翻转为黑方视角
- 国际化（i18n）：
  - 所有界面文案集中在 `app/web/i18n.js`
  - 支持英语 + 简体中文
  - GUI 可直接切换语言
- 非法走子处理：
  - 后端返回结构化错误码
  - 前端显示本地化友好错误信息
  - 可区分：
    - 非法走子
    - 未到你走
    - 所选棋子无合法落点

## 引擎路径默认逻辑
- 输入框为空：使用 `CHESS_STOCKFISH_PATH`
- 输入框有值：使用用户填写路径

## GUI 使用步骤
1. 选择语言（EN / 中文）
2. 选择模式（人人 / 人机 / 机机）
3. 人机模式下选择人类执子颜色
4. 设置思考时间；机机模式下设置局数
5. 可选填写引擎路径（不填则走环境变量默认）
6. 使用按钮：开始 / 重开 / 停止 / 导出 PGN

界面显示：
- 当前走子方
- 当前模式提示
- 机机进行状态
- 走子记录
- FEN
- 对局结果
- PGN
- 系列统计（白胜/黑胜/和棋）

## API 列表
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
- `GET /api/stage3/recognize`（`501` 未完成）
