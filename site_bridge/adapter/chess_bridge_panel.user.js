// ==UserScript==
// @name         ChessBridge Panel (Local Site)
// @namespace    local.chess.bridge
// @version      0.1.0
// @description  Injects a local control panel and square-click bridge for your own chess website.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const PANEL_ID = "ChessBridgePanel";
  const STYLE_ID = "ChessBridgePanelStyle";

  function ensureBridge() {
    if (!window.chessBridge) {
      // minimal fallback bridge placeholder; replace with real site bridge when available
      window.chessBridge = {
        selectedSquare: null,
        getBoardState() {
          return { message: "chessBridge not connected to page state yet" };
        },
        selectSquare(square) {
          this.selectedSquare = square;
        },
        movePiece(from, to) {
          console.warn("movePiece called but no page integration", { from, to });
        },
        renderBoard() {},
      };
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 20px;
        top: 20px;
        z-index: 999999;
        background: rgba(255,255,255,.97);
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,.16);
        padding: 10px;
        width: 280px;
        font-family: Arial, sans-serif;
      }
      #${PANEL_ID} input, #${PANEL_ID} button {
        margin-top: 6px;
        padding: 6px;
      }
      #${PANEL_ID} .row {
        display: flex;
        gap: 6px;
      }
      #${PANEL_ID} pre {
        margin-top: 8px;
        background: #f5f5f5;
        border-radius: 8px;
        padding: 8px;
        max-height: 220px;
        overflow: auto;
        white-space: pre-wrap;
        font-size: 12px;
      }
      .square.selected, [data-square].selected {
        outline: 3px solid #4da3ff;
      }
    `;
    document.head.appendChild(style);
  }

  function highlightSelectedSquare(square) {
    document.querySelectorAll("[data-square]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.square === square);
    });
  }

  function bindSquareClicks() {
    document.querySelectorAll("[data-square]").forEach((el) => {
      if (el.dataset.cbBound === "1") return;
      el.dataset.cbBound = "1";

      el.addEventListener("click", () => {
        const sq = el.dataset.square;
        if (!sq) return;

        const bridge = window.chessBridge;
        if (!bridge) return;

        if (!bridge.selectedSquare) {
          bridge.selectSquare?.(sq);
          highlightSelectedSquare(sq);
          return;
        }

        const from = bridge.selectedSquare;
        const to = sq;

        if (from === to) {
          bridge.selectedSquare = null;
          bridge.renderBoard?.();
          highlightSelectedSquare("");
          return;
        }

        bridge.movePiece?.(from, to);
        bridge.selectedSquare = null;
        bridge.renderBoard?.();
        highlightSelectedSquare("");
      });
    });
  }

  function updateOutput(out) {
    try {
      out.textContent = JSON.stringify(window.chessBridge?.getBoardState?.(), null, 2);
    } catch (e) {
      out.textContent = String(e);
    }
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const title = document.createElement("div");
    title.textContent = "Chess Bridge";
    title.style.fontWeight = "700";

    const fromInput = document.createElement("input");
    fromInput.placeholder = "e2";

    const toInput = document.createElement("input");
    toInput.placeholder = "e4";

    const moveBtn = document.createElement("button");
    moveBtn.textContent = "Move";

    const selectBtn = document.createElement("button");
    selectBtn.textContent = "Select";

    const stateBtn = document.createElement("button");
    stateBtn.textContent = "State";

    const out = document.createElement("pre");

    const row1 = document.createElement("div");
    row1.className = "row";
    row1.appendChild(fromInput);
    row1.appendChild(toInput);

    const row2 = document.createElement("div");
    row2.className = "row";
    row2.appendChild(moveBtn);
    row2.appendChild(selectBtn);
    row2.appendChild(stateBtn);

    moveBtn.onclick = () => {
      const from = fromInput.value.trim();
      const to = toInput.value.trim();
      if (!from || !to) return;
      window.chessBridge?.movePiece?.(from, to);
      window.chessBridge?.renderBoard?.();
      updateOutput(out);
    };

    selectBtn.onclick = () => {
      const sq = fromInput.value.trim();
      if (!sq) return;
      window.chessBridge?.selectSquare?.(sq);
      highlightSelectedSquare(sq);
      updateOutput(out);
    };

    stateBtn.onclick = () => updateOutput(out);

    panel.appendChild(title);
    panel.appendChild(row1);
    panel.appendChild(row2);
    panel.appendChild(out);
    document.body.appendChild(panel);

    updateOutput(out);
  }

  function init() {
    ensureBridge();
    ensureStyles();
    createPanel();
    bindSquareClicks();
  }

  const observer = new MutationObserver(() => {
    init();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
