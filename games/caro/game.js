// Caro (Gomoku 15x15) Engine with AI & Pan/Zoom
(function () {
  'use strict';

  const BOARD_SIZE = 15;
  const STAR_POINTS = [
    { r: 3, c: 3 }, { r: 3, c: 11 },
    { r: 7, c: 7 }, // Tengen
    { r: 11, c: 3 }, { r: 11, c: 11 }
  ];

  // State
  let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  let currentPlayer = 'X'; // 'X' always starts
  let gameMode = 'pve'; // 'pve' or 'pvp'
  let difficulty = 'medium'; // 'easy', 'medium', 'hard'
  let isGameOver = false;
  let moveHistory = []; // [{ r, c, player }]
  let winningCells = [];
  let botTimer = null;

  // Pan & Zoom State
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let initialPinchDistance = null;
  let touchHasMoved = false;

  // DOM Elements
  const boardGrid = document.getElementById('board-grid');
  const boardStage = document.getElementById('board-stage');
  const viewport = document.getElementById('viewport');
  const turnBadge = document.getElementById('status-turn');
  const turnText = turnBadge.querySelector('.turn-text');
  const modePveBtn = document.getElementById('mode-pve');
  const modePvpBtn = document.getElementById('mode-pvp');
  const diffSelector = document.getElementById('diff-selector');
  const diffButtons = diffSelector.querySelectorAll('button');
  const undoBtn = document.getElementById('btn-undo');
  const restartBtn = document.getElementById('btn-restart');
  const zoomInBtn = document.getElementById('btn-zoom-in');
  const zoomOutBtn = document.getElementById('btn-zoom-out');
  const zoomResetBtn = document.getElementById('btn-zoom-reset');

  // Modal Elements
  const winnerModal = document.getElementById('winner-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMsg = document.getElementById('modal-msg');
  const modalIcon = document.getElementById('modal-icon');
  const modalRestartBtn = document.getElementById('modal-btn-restart');
  const modalCloseBtn = document.getElementById('modal-btn-close');

  // Initialize
  function init() {
    createBoardDOM();
    bindEvents();
    if (window.ViggaNav) {
      window.ViggaNav.init();
    }
    fitBoardToScreen();
    resetGame();
  }

  // 1. DOM Board Construction
  function createBoardDOM() {
    boardGrid.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Check star point
        const isStar = STAR_POINTS.some(p => p.r === r && p.c === c);
        if (isStar) {
          cell.classList.add('star-point');
        }

        boardGrid.appendChild(cell);
      }
    }
  }

  // 2. Pan & Zoom Engine
  function updateTransform() {
    boardStage.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
  }

  function setScale(newScale) {
    scale = Math.min(Math.max(newScale, 0.5), 2.5);
    updateTransform();
  }

  function fitBoardToScreen() {
    const vpWidth = viewport.clientWidth;
    const vpHeight = viewport.clientHeight;
    const boardWidth = boardGrid.offsetWidth || 530;
    const boardHeight = boardGrid.offsetHeight || 530;

    const scaleX = (vpWidth - 24) / boardWidth;
    const scaleY = (vpHeight - 24) / boardHeight;
    const optimalScale = Math.min(scaleX, scaleY, 1.1);

    scale = Math.max(optimalScale, 0.55);
    panX = 0;
    panY = 0;
    updateTransform();
  }

  // 3. Gameplay Mechanics
  function makeMove(r, c) {
    if (isGameOver || board[r][c] !== null) {
      if (window.ViggaAudio && board[r][c] !== null) {
        window.ViggaAudio.playInvalid();
      }
      return false;
    }

    const player = currentPlayer;
    board[r][c] = player;
    moveHistory.push({ r, c, player });

    renderMove(r, c, player);

    if (window.ViggaAudio) {
      window.ViggaAudio.playMove(player === 'X');
    }

    // Check Win
    const winResult = checkWin(r, c, player);
    if (winResult) {
      handleGameOver(player, winResult);
      return true;
    }

    // Check Draw
    if (moveHistory.length === BOARD_SIZE * BOARD_SIZE) {
      handleGameOver('DRAW', []);
      return true;
    }

    // Switch turn
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnIndicator();

    // Trigger AI if in PvE mode and it's O's turn
    if (gameMode === 'pve' && currentPlayer === 'O' && !isGameOver) {
      if (botTimer) clearTimeout(botTimer);
      botTimer = setTimeout(() => {
        executeBotTurn();
      }, 250);
    }

    return true;
  }

  function renderMove(r, c, player) {
    // Remove previous last-move highlight
    const prevLast = boardGrid.querySelector('.cell.last-move');
    if (prevLast) prevLast.classList.remove('last-move');

    const cell = getCellDOM(r, c);
    cell.classList.add('filled', 'last-move');

    const piece = document.createElement('div');
    piece.className = `piece piece-${player.toLowerCase()}`;
    piece.textContent = player;
    cell.appendChild(piece);
  }

  function getCellDOM(r, c) {
    return boardGrid.children[r * BOARD_SIZE + c];
  }

  function updateTurnIndicator() {
    turnBadge.className = `turn-badge turn-${currentPlayer.toLowerCase()}`;
    if (gameMode === 'pve' && currentPlayer === 'O') {
      turnText.textContent = 'Máy đang nghĩ...';
    } else {
      turnText.textContent = `Lượt của ${currentPlayer}`;
    }
  }

  // 4. Win Detection (Gomoku Free: 5 in a line)
  function checkWin(r, c, player) {
    const directions = [
      { dr: 0, dc: 1 },  // Horizontal
      { dr: 1, dc: 0 },  // Vertical
      { dr: 1, dc: 1 },  // Diagonal \
      { dr: 1, dc: -1 }  // Diagonal /
    ];

    for (const { dr, dc } of directions) {
      let line = [{ r, c }];

      // Count positive direction
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
          line.push({ r: nr, c: nc });
          step++;
        } else {
          break;
        }
      }

      // Count negative direction
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
          line.push({ r: nr, c: nc });
          step++;
        } else {
          break;
        }
      }

      if (line.length >= 5) {
        return line;
      }
    }
    return null;
  }

  function handleGameOver(winner, winLine) {
    isGameOver = true;
    winningCells = winLine;

    // Highlight winning cells
    winLine.forEach(({ r, c }) => {
      const cell = getCellDOM(r, c);
      if (cell) cell.classList.add('winning');
    });

    if (winner === 'DRAW') {
      modalIcon.textContent = '🤝';
      modalTitle.textContent = 'Ván cờ Hòa!';
      modalMsg.textContent = 'Hai bên bất phân thắng bại trên toàn bàn cờ.';
      if (window.ViggaAudio) window.ViggaAudio.playDraw();
    } else {
      const isPlayerWin = (gameMode === 'pve' && winner === 'X') || (gameMode === 'pvp');
      modalIcon.textContent = isPlayerWin ? '🏆' : '🤖';
      modalTitle.textContent = winner === 'X' ? 'Người chơi X Thắng!' : (gameMode === 'pve' ? 'Máy (O) Thắng!' : 'Người chơi O Thắng!');
      modalMsg.textContent = `Đã xếp được ${winLine.length} quân cờ thẳng hàng thành công.`;
      if (window.ViggaAudio) window.ViggaAudio.playWin();
    }

    setTimeout(() => {
      winnerModal.classList.remove('hidden');
    }, 600);
  }

  // 5. Smart AI Bot Engine
  function executeBotTurn() {
    if (isGameOver || currentPlayer !== 'O') return;

    const move = chooseBestMove();
    if (move) {
      makeMove(move.r, move.c);
    }
  }

  function chooseBestMove() {
    // 1. First move for bot if board is almost empty
    if (moveHistory.length <= 1) {
      const last = moveHistory[0];
      const offsets = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
      ];
      for (const { dr, dc } of offsets) {
        const nr = last.r + dr;
        const nc = last.c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) {
          return { r: nr, c: nc };
        }
      }
    }

    // 2. Candidate moves (only inspect empty cells adjacent to filled cells within distance 2)
    const candidates = [];
    const radius = difficulty === 'easy' ? 1 : 2;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null && hasAdjacentPiece(r, c, radius)) {
          candidates.push({ r, c });
        }
      }
    }

    if (candidates.length === 0) {
      return { r: 7, c: 7 };
    }

    // Easy mode: random chance to pick any adjacent move
    if (difficulty === 'easy' && Math.random() < 0.4) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Evaluate candidates
    let bestScore = -Infinity;
    let bestMoves = [];

    const defWeight = difficulty === 'hard' ? 1.25 : 1.0;
    const atkWeight = difficulty === 'hard' ? 1.35 : 1.0;

    for (const cand of candidates) {
      const attackScore = evaluateCellForPlayer(cand.r, cand.c, 'O');
      const defendScore = evaluateCellForPlayer(cand.r, cand.c, 'X');

      // Proximity to center bonus
      const distFromCenter = Math.abs(cand.r - 7) + Math.abs(cand.c - 7);
      const centerBonus = Math.max(0, 14 - distFromCenter);

      let totalScore = (attackScore * atkWeight) + (defendScore * defWeight) + centerBonus;

      // In hard mode, prioritize winning instantly or blocking immediate 5
      if (attackScore >= 50000) totalScore += 1000000;
      if (defendScore >= 50000) totalScore += 500000;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMoves = [cand];
      } else if (totalScore === bestScore) {
        bestMoves.push(cand);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function hasAdjacentPiece(r, c, dist) {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== null) {
          return true;
        }
      }
    }
    return false;
  }

  // Heuristic pattern evaluator for Gomoku
  function evaluateCellForPlayer(r, c, player) {
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 }
    ];

    let totalScore = 0;

    for (const { dr, dc } of directions) {
      let count = 1; // Count stone if placed here
      let openEnds = 0;

      // Positive side
      let step = 1;
      let blockedPos = false;
      while (step <= 4) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
          blockedPos = true;
          break;
        }
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else if (board[nr][nc] === null) {
          openEnds++;
          break;
        } else {
          blockedPos = true;
          break;
        }
      }

      // Negative side
      step = 1;
      let blockedNeg = false;
      while (step <= 4) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
          blockedNeg = true;
          break;
        }
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else if (board[nr][nc] === null) {
          openEnds++;
          break;
        } else {
          blockedNeg = true;
          break;
        }
      }

      // Scoring table
      if (count >= 5) {
        totalScore += 50000; // Immediate win
      } else if (count === 4) {
        if (openEnds === 2) totalScore += 12000; // Open 4 (unstoppable)
        else if (openEnds === 1) totalScore += 2500;  // Blocked 4
      } else if (count === 3) {
        if (openEnds === 2) totalScore += 2000;  // Open 3
        else if (openEnds === 1) totalScore += 300;   // Blocked 3
      } else if (count === 2) {
        if (openEnds === 2) totalScore += 200;
        else if (openEnds === 1) totalScore += 40;
      } else if (count === 1) {
        if (openEnds === 2) totalScore += 10;
      }
    }

    return totalScore;
  }

  // 6. Undo Move
  function undoMove() {
    if (botTimer) clearTimeout(botTimer);
    if (moveHistory.length === 0 || isGameOver) {
      if (window.ViggaAudio) window.ViggaAudio.playInvalid();
      return;
    }

    // Number of moves to undo:
    // In PvE: If computer moved, undo 2 moves (both Bot and Player).
    // If only player moved (waiting for bot), undo 1 move.
    const stepsToUndo = (gameMode === 'pve' && moveHistory.length >= 2) ? 2 : 1;

    for (let i = 0; i < stepsToUndo; i++) {
      if (moveHistory.length === 0) break;
      const lastMove = moveHistory.pop();
      board[lastMove.r][lastMove.c] = null;

      const cell = getCellDOM(lastMove.r, lastMove.c);
      cell.classList.remove('filled', 'last-move');
      cell.innerHTML = '';
      if (cell.classList.contains('star-point')) {
        // Keep star point
      }
    }

    // Restore last-move highlight
    if (moveHistory.length > 0) {
      const prev = moveHistory[moveHistory.length - 1];
      const cell = getCellDOM(prev.r, prev.c);
      cell.classList.add('last-move');
      currentPlayer = prev.player === 'X' ? 'O' : 'X';
    } else {
      currentPlayer = 'X';
    }

    updateTurnIndicator();
    if (window.ViggaAudio) window.ViggaAudio.playUndo();
  }

  // 7. Reset Game
  function resetGame() {
    if (botTimer) clearTimeout(botTimer);
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    moveHistory = [];
    winningCells = [];
    isGameOver = false;
    currentPlayer = 'X';

    // Clear board cells
    const cells = boardGrid.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.className = 'cell';
      cell.innerHTML = '';
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      if (STAR_POINTS.some(p => p.r === r && p.c === c)) {
        cell.classList.add('star-point');
      }
    });

    winnerModal.classList.add('hidden');
    updateTurnIndicator();
  }

  // 8. Event Bindings
  function bindEvents() {
    // Cell Click & Tap Handling
    boardGrid.addEventListener('click', (e) => {
      if (touchHasMoved) return; // Prevent triggering move while panning
      const cell = e.target.closest('.cell');
      if (!cell) return;

      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);

      // In PvE, user can only click when it's X's turn
      if (gameMode === 'pve' && currentPlayer !== 'X') return;

      makeMove(r, c);
    });

    // Touch & Mouse Pan and Zoom
    viewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      viewport.classList.remove('panning');
    });

    // Touch events for Mobile (Pan & Pinch Zoom)
    viewport.addEventListener('touchstart', (e) => {
      touchHasMoved = false;
      if (e.touches.length === 1) {
        isPanning = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isPanning = false;
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - (startX + panX);
        const dy = e.touches[0].clientY - (startY + panY);
        if (Math.hypot(dx, dy) > 8) {
          touchHasMoved = true;
        }
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2 && initialPinchDistance) {
        touchHasMoved = true;
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        const diff = currentDist / initialPinchDistance;
        setScale(scale * diff);
        initialPinchDistance = currentDist;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isPanning = false;
        initialPinchDistance = null;
      }
    }, { passive: true });

    // Mouse Wheel Zoom
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setScale(scale * zoomFactor);
    }, { passive: false });

    // Mode Selector
    modePveBtn.addEventListener('click', () => {
      if (gameMode === 'pve') return;
      gameMode = 'pve';
      modePveBtn.classList.add('active');
      modePvpBtn.classList.remove('active');
      diffSelector.style.display = 'inline-flex';
      resetGame();
    });

    modePvpBtn.addEventListener('click', () => {
      if (gameMode === 'pvp') return;
      gameMode = 'pvp';
      modePvpBtn.classList.add('active');
      modePveBtn.classList.remove('active');
      diffSelector.style.display = 'none';
      resetGame();
    });

    // Difficulty Buttons
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    // Undo & Restart
    undoBtn.addEventListener('click', undoMove);
    restartBtn.addEventListener('click', resetGame);
    modalRestartBtn.addEventListener('click', resetGame);
    modalCloseBtn.addEventListener('click', () => {
      winnerModal.classList.add('hidden');
    });

    // Zoom Buttons
    zoomInBtn.addEventListener('click', () => setScale(scale * 1.15));
    zoomOutBtn.addEventListener('click', () => setScale(scale / 1.15));
    zoomResetBtn.addEventListener('click', fitBoardToScreen);

    // Window Resize
    window.addEventListener('resize', () => {
      fitBoardToScreen();
    });
  }

  function getTouchDistance(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
