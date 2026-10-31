/**
 * Block Blast — Pure Vanilla ES6 HTML5 Canvas Mini-Game
 * Vigga Mini-Games Collection
 */

(function () {
  'use strict';

  // Constants & Config
  const GRID_SIZE = 8;
  const STORAGE_KEY_BEST = 'vigga_block-blast_best_score';

  // Polyomino Shapes Definitions
  const SHAPES = [
    // 1-block
    { id: 'dot', matrix: [[1]], color: '#38bdf8' },

    // 2-blocks
    { id: 'h2', matrix: [[1, 1]], color: '#34d399' },
    { id: 'v2', matrix: [[1], [1]], color: '#34d399' },

    // 3-blocks
    { id: 'h3', matrix: [[1, 1, 1]], color: '#fbbf24' },
    { id: 'v3', matrix: [[1], [1], [1]], color: '#fbbf24' },
    { id: 'corner2_tl', matrix: [[1, 1], [1, 0]], color: '#f43f5e' },
    { id: 'corner2_tr', matrix: [[1, 1], [0, 1]], color: '#f43f5e' },
    { id: 'corner2_bl', matrix: [[1, 0], [1, 1]], color: '#f43f5e' },
    { id: 'corner2_br', matrix: [[0, 1], [1, 1]], color: '#f43f5e' },

    // 4-blocks (Tetrominoes)
    { id: 'sq2', matrix: [[1, 1], [1, 1]], color: '#fb7185' },
    { id: 'h4', matrix: [[1, 1, 1, 1]], color: '#60a5fa' },
    { id: 'v4', matrix: [[1], [1], [1], [1]], color: '#60a5fa' },
    { id: 't_up', matrix: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
    { id: 't_down', matrix: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' },
    { id: 'l_norm', matrix: [[1, 0], [1, 0], [1, 1]], color: '#fb923c' },
    { id: 'l_inv', matrix: [[0, 1], [0, 1], [1, 1]], color: '#fb923c' },
    { id: 'j_norm', matrix: [[1, 1], [1, 0], [1, 0]], color: '#fb923c' },
    { id: 'j_inv', matrix: [[1, 1], [0, 1], [0, 1]], color: '#fb923c' },
    { id: 's_shape', matrix: [[0, 1, 1], [1, 1, 0]], color: '#2dd4bf' },
    { id: 'z_shape', matrix: [[1, 1, 0], [0, 1, 1]], color: '#2dd4bf' },

    // 5-blocks
    { id: 'h5', matrix: [[1, 1, 1, 1, 1]], color: '#818cf8' },
    { id: 'v5', matrix: [[1], [1], [1], [1], [1]], color: '#818cf8' },
    { id: 'corner3_tl', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#ec4899' },
    { id: 'corner3_tr', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#ec4899' },
    { id: 'corner3_bl', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: '#ec4899' },
    { id: 'corner3_br', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: '#ec4899' },

    // 9-block (Rare big square)
    { id: 'sq3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#c084fc' }
  ];

  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const canvasContainer = document.getElementById('canvas-container');
  const currentScoreEl = document.getElementById('current-score');
  const bestScoreEl = document.getElementById('best-score');
  const comboBadgeEl = document.getElementById('combo-badge');
  const comboTextEl = document.getElementById('combo-text');
  const btnRestart = document.getElementById('btn-restart');
  const btnUndo = document.getElementById('btn-undo');
  const gameOverModal = document.getElementById('game-over-modal');
  const modalFinalScore = document.getElementById('modal-final-score');
  const modalBestScore = document.getElementById('modal-best-score');
  const newHighBadge = document.getElementById('new-high-badge');
  const btnModalRestart = document.getElementById('btn-modal-restart');

  // Game State
  let board = createEmptyBoard();
  let dock = [null, null, null];
  let score = 0;
  let bestScore = parseInt(localStorage.getItem(STORAGE_KEY_BEST) || '0', 10);
  let combo = 0;
  let isGameOver = false;
  let historyStack = [];

  // Visual Effects
  let particles = [];
  let floatingTexts = [];
  let screenShake = 0;

  // Layout Metrics (computed dynamically on resize)
  let metrics = {
    width: 0,
    height: 0,
    dpr: 1,
    boardX: 0,
    boardY: 0,
    boardSize: 0,
    cellSize: 0,
    cellGap: 3,
    dockY: 0,
    dockHeight: 0,
    dockSlots: []
  };

  // Drag & Drop State
  let drag = {
    active: false,
    slotIndex: -1,
    piece: null,
    pointerX: 0,
    pointerY: 0,
    touchOffsetY: 0, // Lift piece above finger on mobile touch
    hoverRow: -1,
    hoverCol: -1,
    canPlaceHover: false,
    selectedSlot: -1 // For tap-to-select mode
  };

  // Helper Functions
  function createEmptyBoard() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  }

  function cloneBoard(b) {
    return b.map(row => [...row]);
  }

  function cloneDock(d) {
    return d.map(item => item ? { ...item, matrix: item.matrix.map(r => [...r]) } : null);
  }

  function saveHistoryState() {
    // Keep maximum 5 undo steps
    if (historyStack.length >= 5) {
      historyStack.shift();
    }
    historyStack.push({
      board: cloneBoard(board),
      dock: cloneDock(dock),
      score,
      combo
    });
    updateUndoButtonState();
  }

  function updateUndoButtonState() {
    if (btnUndo) {
      btnUndo.disabled = historyStack.length === 0 || isGameOver;
      btnUndo.style.opacity = (historyStack.length === 0 || isGameOver) ? '0.45' : '1';
      btnUndo.style.pointerEvents = (historyStack.length === 0 || isGameOver) ? 'none' : 'auto';
    }
  }

  function undoLastMove() {
    if (historyStack.length === 0 || isGameOver) return;
    const previous = historyStack.pop();
    board = previous.board;
    dock = previous.dock;
    score = previous.score;
    combo = previous.combo;

    currentScoreEl.textContent = score;
    updateComboDisplay();
    updateUndoButtonState();

    if (window.ViggaAudio && typeof window.ViggaAudio.playUndo === 'function') {
      window.ViggaAudio.playUndo();
    }
  }

  // Sound Synthesizer Extensions
  function playBlastSound(comboCount) {
    if (window.ViggaAudio && window.ViggaAudio.isMuted()) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const actx = new AudioCtx();
      const baseFreq = 260 + Math.min(comboCount * 60, 480);
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];

      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, actx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.18, actx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + idx * 0.04);
        osc.stop(actx.currentTime + idx * 0.04 + 0.24);
      });
    } catch (e) {
      if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
        window.ViggaAudio.playMove(true);
      }
    }
  }

  // Check Placement Rules
  function canPlacePiece(pieceMatrix, startRow, startCol, targetBoard = board) {
    const numRows = pieceMatrix.length;
    const numCols = pieceMatrix[0].length;

    if (startRow < 0 || startCol < 0) return false;
    if (startRow + numRows > GRID_SIZE || startCol + numCols > GRID_SIZE) return false;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (pieceMatrix[r][c] === 1) {
          if (targetBoard[startRow + r][startCol + c] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function canPieceFitAnywhere(pieceMatrix, targetBoard = board) {
    const numRows = pieceMatrix.length;
    const numCols = pieceMatrix[0].length;

    for (let r = 0; r <= GRID_SIZE - numRows; r++) {
      for (let c = 0; c <= GRID_SIZE - numCols; c++) {
        if (canPlacePiece(pieceMatrix, r, c, targetBoard)) {
          return true;
        }
      }
    }
    return false;
  }

  // Generate 3 Random Pieces with Fair Play Guarantee
  function generateNewDock() {
    const newDock = [];
    for (let i = 0; i < 3; i++) {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      newDock.push({
        id: randomShape.id,
        matrix: randomShape.matrix,
        color: randomShape.color
      });
    }

    // Fair guarantee: ensure at least one piece can fit on current board
    const hasValidMove = newDock.some(p => canPieceFitAnywhere(p.matrix, board));
    if (!hasValidMove) {
      // Find a simple shape that fits
      const simpleShapes = SHAPES.filter(s => s.id === 'dot' || s.id === 'h2' || s.id === 'v2');
      for (const s of simpleShapes) {
        if (canPieceFitAnywhere(s.matrix, board)) {
          newDock[0] = { id: s.id, matrix: s.matrix, color: s.color };
          break;
        }
      }
    }

    dock = newDock;
  }

  // Check if Dock is Empty or No Moves Left
  function checkGameStateAfterMove() {
    const isDockEmpty = dock.every(p => p === null);
    if (isDockEmpty) {
      generateNewDock();
    }

    // Check game over
    const activePieces = dock.filter(p => p !== null);
    const hasMove = activePieces.some(p => canPieceFitAnywhere(p.matrix, board));

    if (!hasMove && activePieces.length > 0) {
      triggerGameOver();
    }
  }

  // Line Clear Detection & Blast
  function processBoardClears() {
    const fullRows = [];
    const fullCols = [];

    // Find full horizontal rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    // Find full vertical columns
    for (let c = 0; c < GRID_SIZE; c++) {
      let isColFull = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] === null) {
          isColFull = false;
          break;
        }
      }
      if (isColFull) {
        fullCols.push(c);
      }
    }

    const totalLines = fullRows.length + fullCols.length;

    if (totalLines > 0) {
      combo++;
      screenShake = Math.min(8 + totalLines * 4, 24);
      playBlastSound(combo);

      // Collect cleared cells for particle blast
      const clearedSet = new Set();
      fullRows.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
          clearedSet.add(`${r},${c}`);
        }
      });
      fullCols.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
          clearedSet.add(`${r},${c}`);
        }
      });

      // Spawn particles & clear board cells
      clearedSet.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const cellColor = board[r][c] || '#38bdf8';
        spawnCellParticles(r, c, cellColor);
        board[r][c] = null;
      });

      // Score calculation: 10 pts per line * combo multiplier + multi-line bonus
      const lineScore = totalLines * 10 * combo + (totalLines > 1 ? (totalLines - 1) * 20 : 0);
      score += lineScore;

      // Spawn floating score badge
      const midRow = fullRows.length > 0 ? fullRows[0] : (fullCols.length > 0 ? 4 : 4);
      const midCol = fullCols.length > 0 ? fullCols[0] : 4;
      const { x, y } = getCellCenter(midRow, midCol);
      addFloatingText(`+${lineScore}${combo > 1 ? ` Combo x${combo}!` : ''}`, x, y, '#fbbf24');
    } else {
      combo = 0;
    }

    updateScoreDisplay();
    updateComboDisplay();
  }

  function getCellCenter(r, c) {
    const cellSizeWithGap = metrics.cellSize + metrics.cellGap;
    return {
      x: metrics.boardX + c * cellSizeWithGap + metrics.cellSize / 2,
      y: metrics.boardY + r * cellSizeWithGap + metrics.cellSize / 2
    };
  }

  function spawnCellParticles(r, c, color) {
    const center = getCellCenter(r, c);
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 4.5;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color,
        alpha: 1,
        life: 1
      });
    }
  }

  function addFloatingText(text, x, y, color = '#ffffff') {
    floatingTexts.push({
      text,
      x,
      y,
      alpha: 1,
      scale: 1.3,
      vy: -1.8,
      color
    });
  }

  function updateScoreDisplay() {
    currentScoreEl.textContent = score;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY_BEST, String(bestScore));
    }
    bestScoreEl.textContent = bestScore;
  }

  function updateComboDisplay() {
    if (combo >= 2) {
      comboTextEl.textContent = `COMBO x${combo}`;
      comboBadgeEl.classList.remove('hidden');
    } else {
      comboBadgeEl.classList.add('hidden');
    }
  }

  function triggerGameOver() {
    isGameOver = true;
    updateUndoButtonState();

    if (window.ViggaAudio && typeof window.ViggaAudio.playInvalid === 'function') {
      window.ViggaAudio.playInvalid();
    }

    modalFinalScore.textContent = score;
    modalBestScore.textContent = bestScore;

    if (score === bestScore && score > 0) {
      newHighBadge.classList.remove('hidden');
    } else {
      newHighBadge.classList.add('hidden');
    }

    setTimeout(() => {
      gameOverModal.classList.remove('hidden');
    }, 400);
  }

  function restartGame() {
    board = createEmptyBoard();
    score = 0;
    combo = 0;
    isGameOver = false;
    historyStack = [];
    particles = [];
    floatingTexts = [];
    drag.active = false;
    drag.slotIndex = -1;
    drag.selectedSlot = -1;

    gameOverModal.classList.add('hidden');
    updateScoreDisplay();
    updateComboDisplay();
    updateUndoButtonState();
    generateNewDock();

    if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
      window.ViggaAudio.playMove(true);
    }
  }

  // Layout Metrics Calculation
  function updateMetrics() {
    const rect = canvasContainer.getBoundingClientRect();
    const width = Math.min(rect.width, 480);
    const height = Math.min(rect.height, 680);

    metrics.dpr = window.devicePixelRatio || 1;
    metrics.width = width;
    metrics.height = height;

    canvas.width = Math.floor(width * metrics.dpr);
    canvas.height = Math.floor(height * metrics.dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform?.();
    ctx.scale(metrics.dpr, metrics.dpr);

    // Board Metrics: square centered horizontally
    const padding = 16;
    const availableWidth = width - padding * 2;
    const boardSize = Math.min(availableWidth, height * 0.58);
    metrics.boardSize = boardSize;
    metrics.boardX = (width - boardSize) / 2;
    metrics.boardY = 16;
    metrics.cellGap = 3;
    metrics.cellSize = (boardSize - metrics.cellGap * (GRID_SIZE - 1)) / GRID_SIZE;

    // Dock Metrics
    metrics.dockY = metrics.boardY + boardSize + 20;
    metrics.dockHeight = height - metrics.dockY - 12;
    const slotWidth = (width - padding * 2) / 3;

    metrics.dockSlots = [0, 1, 2].map(i => ({
      x: padding + i * slotWidth,
      y: metrics.dockY,
      width: slotWidth,
      height: metrics.dockHeight,
      centerX: padding + i * slotWidth + slotWidth / 2,
      centerY: metrics.dockY + metrics.dockHeight / 2
    }));
  }

  // Drawing Helpers
  function drawRoundedRect(context, x, y, w, h, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function drawBlockCell(context, x, y, size, color, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;

    const r = Math.max(3, size * 0.16);
    drawRoundedRect(context, x, y, size, size, r);
    context.fillStyle = color;
    context.fill();

    // Top subtle bevel highlight
    context.beginPath();
    drawRoundedRect(context, x + 1.5, y + 1.5, size - 3, size * 0.35, r);
    context.fillStyle = 'rgba(255, 255, 255, 0.22)';
    context.fill();

    // Inset border
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    drawRoundedRect(context, x, y, size, size, r);
    context.stroke();

    context.restore();
  }

  // Render Loop
  function render() {
    ctx.clearRect(0, 0, metrics.width, metrics.height);

    ctx.save();
    // Screen shake
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      screenShake = Math.max(0, screenShake - 1.2);
    }

    // 1. Draw 8x8 Board Background Card
    const boardRadius = 14;
    drawRoundedRect(ctx, metrics.boardX - 6, metrics.boardY - 6, metrics.boardSize + 12, metrics.boardSize + 12, boardRadius);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // 2. Draw Board Grid Cells
    const cellSizeWithGap = metrics.cellSize + metrics.cellGap;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = metrics.boardX + c * cellSizeWithGap;
        const cy = metrics.boardY + r * cellSizeWithGap;

        // Empty cell placeholder
        drawRoundedRect(ctx, cx, cy, metrics.cellSize, metrics.cellSize, 4);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Filled cell
        if (board[r][c] !== null) {
          drawBlockCell(ctx, cx, cy, metrics.cellSize, board[r][c]);
        }
      }
    }

    // 3. Draw Placement Preview Ghost if Dragging or Selected
    if (drag.canPlaceHover && drag.piece && drag.hoverRow >= 0 && drag.hoverCol >= 0) {
      const pieceMatrix = drag.piece.matrix;
      const numRows = pieceMatrix.length;
      const numCols = pieceMatrix[0].length;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (pieceMatrix[r][c] === 1) {
            const pr = drag.hoverRow + r;
            const pc = drag.hoverCol + c;
            const cx = metrics.boardX + pc * cellSizeWithGap;
            const cy = metrics.boardY + pr * cellSizeWithGap;
            drawBlockCell(ctx, cx, cy, metrics.cellSize, drag.piece.color, 0.45);
          }
        }
      }
    }

    // 4. Draw Dock Slots & Available Pieces
    metrics.dockSlots.forEach((slot, index) => {
      // Draw subtle slot tray container
      drawRoundedRect(ctx, slot.x + 4, slot.y + 4, slot.width - 8, slot.height - 8, 12);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = (drag.selectedSlot === index) ? '#3b82f6' : '#e2e8f0';
      ctx.stroke();

      const piece = dock[index];
      // Don't draw in slot if actively being dragged
      if (piece && (!drag.active || drag.slotIndex !== index)) {
        const canFit = canPieceFitAnywhere(piece.matrix, board);
        drawDockPiece(ctx, piece, slot.centerX, slot.centerY, canFit ? 1 : 0.35);
      }
    });

    // 5. Draw Actively Dragged Piece
    if (drag.active && drag.piece) {
      const pieceMatrix = drag.piece.matrix;
      const numRows = pieceMatrix.length;
      const numCols = pieceMatrix[0].length;
      const pieceCellSize = metrics.cellSize;
      const pieceWidth = numCols * (pieceCellSize + metrics.cellGap);
      const pieceHeight = numRows * (pieceCellSize + metrics.cellGap);

      // Centered at pointer with touch vertical offset
      const startX = drag.pointerX - pieceWidth / 2;
      const startY = drag.pointerY + drag.touchOffsetY - pieceHeight / 2;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (pieceMatrix[r][c] === 1) {
            const bx = startX + c * (pieceCellSize + metrics.cellGap);
            const by = startY + r * (pieceCellSize + metrics.cellGap);
            drawBlockCell(ctx, bx, by, pieceCellSize, drag.piece.color, 0.95);
          }
        }
      }
    }

    // 6. Draw Blasting Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.035;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Draw Floating Score Badges
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      ft.scale = Math.max(1, ft.scale - 0.015);

      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(18 * ft.scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    requestAnimationFrame(render);
  }

  function drawDockPiece(context, piece, centerX, centerY, alpha = 1) {
    const numRows = piece.matrix.length;
    const numCols = piece.matrix[0].length;
    const miniCellSize = Math.min(22, metrics.cellSize * 0.55);
    const miniGap = 2;

    const totalW = numCols * miniCellSize + (numCols - 1) * miniGap;
    const totalH = numRows * miniCellSize + (numRows - 1) * miniGap;
    const startX = centerX - totalW / 2;
    const startY = centerY - totalH / 2;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (piece.matrix[r][c] === 1) {
          const x = startX + c * (miniCellSize + miniGap);
          const y = startY + r * (miniCellSize + miniGap);
          drawBlockCell(context, x, y, miniCellSize, piece.color, alpha);
        }
      }
    }
  }

  // Pointer & Touch Controls
  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function getSlotAtPosition(x, y) {
    return metrics.dockSlots.findIndex(slot => {
      return x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height;
    });
  }

  function getHoverGridPosition(px, py, piece) {
    if (!piece) return { row: -1, col: -1, canPlace: false };

    const cellSizeWithGap = metrics.cellSize + metrics.cellGap;
    const numRows = piece.matrix.length;
    const numCols = piece.matrix[0].length;
    const pieceWidth = numCols * cellSizeWithGap;
    const pieceHeight = numRows * cellSizeWithGap;

    const pieceTopLeftX = px - pieceWidth / 2;
    const pieceTopLeftY = py - pieceHeight / 2;

    // Nearest column & row
    const col = Math.round((pieceTopLeftX - metrics.boardX) / cellSizeWithGap);
    const row = Math.round((pieceTopLeftY - metrics.boardY) / cellSizeWithGap);

    const canPlace = canPlacePiece(piece.matrix, row, col, board);
    return { row, col, canPlace };
  }

  function handlePointerDown(e) {
    if (isGameOver) return;
    const { x, y } = getCanvasCoordinates(e);

    // 1. Check if clicked a piece in dock
    const slotIdx = getSlotAtPosition(x, y);
    if (slotIdx !== -1 && dock[slotIdx] !== null) {
      const piece = dock[slotIdx];
      // On touch devices, offset piece ~65px above finger so thumb doesn't hide it
      const isTouch = e.pointerType === 'touch';
      const touchOffsetY = isTouch ? -65 : 0;

      drag.active = true;
      drag.slotIndex = slotIdx;
      drag.piece = piece;
      drag.pointerX = x;
      drag.pointerY = y;
      drag.touchOffsetY = touchOffsetY;
      drag.selectedSlot = slotIdx;

      const hover = getHoverGridPosition(x, y + touchOffsetY, piece);
      drag.hoverRow = hover.row;
      drag.hoverCol = hover.col;
      drag.canPlaceHover = hover.canPlace;

      if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
        window.ViggaAudio.playMove(true);
      }
      return;
    }

    // 2. Tap-to-place support (if a piece was already selected from dock, click on board)
    if (drag.selectedSlot !== -1 && dock[drag.selectedSlot] !== null) {
      const selectedPiece = dock[drag.selectedSlot];
      const cellSizeWithGap = metrics.cellSize + metrics.cellGap;
      const col = Math.floor((x - metrics.boardX) / cellSizeWithGap);
      const row = Math.floor((y - metrics.boardY) / cellSizeWithGap);

      if (canPlacePiece(selectedPiece.matrix, row, col, board)) {
        placePieceOnBoard(selectedPiece, row, col, drag.selectedSlot);
        drag.selectedSlot = -1;
      } else {
        drag.selectedSlot = -1;
      }
    }
  }

  function handlePointerMove(e) {
    if (!drag.active) return;
    const { x, y } = getCanvasCoordinates(e);

    drag.pointerX = x;
    drag.pointerY = y;

    const hover = getHoverGridPosition(x, y + drag.touchOffsetY, drag.piece);
    drag.hoverRow = hover.row;
    drag.hoverCol = hover.col;
    drag.canPlaceHover = hover.canPlace;
  }

  function handlePointerUp() {
    if (!drag.active) return;

    if (drag.canPlaceHover && drag.hoverRow >= 0 && drag.hoverCol >= 0) {
      placePieceOnBoard(drag.piece, drag.hoverRow, drag.hoverCol, drag.slotIndex);
      drag.selectedSlot = -1;
    }

    drag.active = false;
    drag.slotIndex = -1;
    drag.piece = null;
    drag.hoverRow = -1;
    drag.hoverCol = -1;
    drag.canPlaceHover = false;
  }

  function placePieceOnBoard(piece, startRow, startCol, dockIndex) {
    saveHistoryState();

    const matrix = piece.matrix;
    const numRows = matrix.length;
    const numCols = matrix[0].length;
    let placedCellsCount = 0;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (matrix[r][c] === 1) {
          board[startRow + r][startCol + c] = piece.color;
          placedCellsCount++;
        }
      }
    }

    // Award placement score
    score += placedCellsCount;
    updateScoreDisplay();

    // Consume piece from dock
    dock[dockIndex] = null;

    if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
      window.ViggaAudio.playMove(false);
    }

    // Check line clears & combos
    processBoardClears();

    // Check next round or game over
    checkGameStateAfterMove();
  }

  // Initialization & Event Binding
  function initGame() {
    bestScoreEl.textContent = bestScore;
    updateScoreDisplay();

    // Setup navigation shell
    if (window.ViggaNav && typeof window.ViggaNav.init === 'function') {
      window.ViggaNav.init({ audioModule: window.ViggaAudio });
    }

    // Event Listeners
    window.addEventListener('resize', () => {
      updateMetrics();
    });

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    btnRestart.addEventListener('click', restartGame);
    btnUndo.addEventListener('click', undoLastMove);
    btnModalRestart.addEventListener('click', restartGame);

    updateMetrics();
    generateNewDock();
    updateUndoButtonState();

    requestAnimationFrame(render);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
