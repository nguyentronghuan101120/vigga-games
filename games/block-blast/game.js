/**
 * Block Blast — Vibrant 3D Cartoon / Casual Toy Mini-Game
 * Vigga Mini-Games Collection
 */

(function () {
  'use strict';

  // Constants & Config
  const GRID_SIZE = 8;
  const STORAGE_KEY_BEST = 'vigga_block-blast_best_score';

  // Juicy Cartoon Toy Colors (Vibrant Saturated Candy Palette)
  const PALETTE = {
    yellow: '#ffb703',   // Radiant Golden Amber
    purple: '#a855f7',   // Juicy Jelly Grape
    red:    '#ef233c',   // Candy Apple Red
    orange: '#fb923c',   // Sweet Tangerine
    green:  '#22c55e',   // Emerald Lime
    blue:   '#0284c7',   // Royal Ocean Blue
    cyan:   '#06b6d4',   // Electric Cyan
    pink:   '#ec4899',   // Bubblegum Pink
    indigo: '#6366f1'    // Deep Indigo
  };

  // Polyomino Shapes Definitions
  const SHAPES = [
    // 1-block
    { id: 'dot', matrix: [[1]], color: PALETTE.cyan },

    // 2-blocks
    { id: 'h2', matrix: [[1, 1]], color: PALETTE.green },
    { id: 'v2', matrix: [[1], [1]], color: PALETTE.green },

    // 3-blocks
    { id: 'h3', matrix: [[1, 1, 1]], color: PALETTE.yellow },
    { id: 'v3', matrix: [[1], [1], [1]], color: PALETTE.yellow },
    { id: 'corner2_tl', matrix: [[1, 1], [1, 0]], color: PALETTE.red },
    { id: 'corner2_tr', matrix: [[1, 1], [0, 1]], color: PALETTE.red },
    { id: 'corner2_bl', matrix: [[1, 0], [1, 1]], color: PALETTE.red },
    { id: 'corner2_br', matrix: [[0, 1], [1, 1]], color: PALETTE.red },

    // 4-blocks (Tetrominoes)
    { id: 'sq2', matrix: [[1, 1], [1, 1]], color: PALETTE.orange },
    { id: 'h4', matrix: [[1, 1, 1, 1]], color: PALETTE.blue },
    { id: 'v4', matrix: [[1], [1], [1], [1]], color: PALETTE.blue },
    { id: 't_up', matrix: [[0, 1, 0], [1, 1, 1]], color: PALETTE.purple },
    { id: 't_down', matrix: [[1, 1, 1], [0, 1, 0]], color: PALETTE.purple },
    { id: 'l_norm', matrix: [[1, 0], [1, 0], [1, 1]], color: PALETTE.pink },
    { id: 'l_inv', matrix: [[0, 1], [0, 1], [1, 1]], color: PALETTE.pink },
    { id: 'j_norm', matrix: [[1, 1], [1, 0], [1, 0]], color: PALETTE.indigo },
    { id: 'j_inv', matrix: [[1, 1], [0, 1], [0, 1]], color: PALETTE.indigo },
    { id: 's_shape', matrix: [[0, 1, 1], [1, 1, 0]], color: PALETTE.cyan },
    { id: 'z_shape', matrix: [[1, 1, 0], [0, 1, 1]], color: PALETTE.cyan },

    // 5-blocks
    { id: 'h5', matrix: [[1, 1, 1, 1, 1]], color: PALETTE.blue },
    { id: 'v5', matrix: [[1], [1], [1], [1], [1]], color: PALETTE.blue },
    { id: 'corner3_tl', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: PALETTE.pink },
    { id: 'corner3_tr', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: PALETTE.pink },
    { id: 'corner3_bl', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: PALETTE.pink },
    { id: 'corner3_br', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: PALETTE.pink },

    // 9-block (Rare challenge block)
    { id: 'sq3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: PALETTE.purple }
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

  // Cartoon Visual Effects
  let particles = [];
  let starSparkles = [];
  let floatingTexts = [];
  let screenShake = 0;

  // Layout Metrics
  let metrics = {
    width: 0,
    height: 0,
    dpr: 1,
    boardX: 0,
    boardY: 0,
    boardSize: 0,
    cellSize: 0,
    cellGap: 4,
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
    touchOffsetY: 0,
    hoverRow: -1,
    hoverCol: -1,
    canPlaceHover: false,
    selectedSlot: -1
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
      const isDisabled = historyStack.length === 0 || isGameOver;
      btnUndo.disabled = isDisabled;
      btnUndo.style.opacity = isDisabled ? '0.4' : '1';
      btnUndo.style.pointerEvents = isDisabled ? 'none' : 'auto';
    }
  }

  function undoLastMove() {
    if (historyStack.length === 0 || isGameOver) return;
    const previous = historyStack.pop();
    board = previous.board;
    dock = previous.dock;
    score = previous.score;
    combo = previous.combo;

    updateScoreDisplay();
    updateComboDisplay();
    updateUndoButtonState();

    if (window.ViggaAudio && typeof window.ViggaAudio.playUndo === 'function') {
      window.ViggaAudio.playUndo();
    }
  }

  // Audio synthesizers for juicy sound effects
  function playBlastSound(comboCount) {
    if (window.ViggaAudio && window.ViggaAudio.isMuted()) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const actx = new AudioCtx();
      const baseFreq = 300 + Math.min(comboCount * 70, 560);
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];

      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, actx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.2, actx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + idx * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + idx * 0.04);
        osc.stop(actx.currentTime + idx * 0.04 + 0.26);
      });
    } catch (e) {
      if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
        window.ViggaAudio.playMove(true);
      }
    }
  }

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

    // Fair guarantee: at least one piece can fit
    const hasValidMove = newDock.some(p => canPieceFitAnywhere(p.matrix, board));
    if (!hasValidMove) {
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

  function checkGameStateAfterMove() {
    const isDockEmpty = dock.every(p => p === null);
    if (isDockEmpty) {
      generateNewDock();
    }

    const activePieces = dock.filter(p => p !== null);
    const hasMove = activePieces.some(p => canPieceFitAnywhere(p.matrix, board));

    if (!hasMove && activePieces.length > 0) {
      triggerGameOver();
    }
  }

  function processBoardClears() {
    const fullRows = [];
    const fullCols = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

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
      screenShake = Math.min(10 + totalLines * 5, 26);
      playBlastSound(combo);

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

      // Spawn juicy particles & clear board cells
      clearedSet.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const cellColor = board[r][c] || PALETTE.yellow;
        spawnCellJuicyBlast(r, c, cellColor);
        board[r][c] = null;
      });

      const lineScore = totalLines * 10 * combo + (totalLines > 1 ? (totalLines - 1) * 20 : 0);
      score += lineScore;

      const midRow = fullRows.length > 0 ? fullRows[0] : 4;
      const midCol = fullCols.length > 0 ? fullCols[0] : 4;
      const { x, y } = getCellCenter(midRow, midCol);
      addFloatingText(`+${lineScore}${combo > 1 ? ` COMBO x${combo}!` : ''}`, x, y, '#fde047');
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

  function spawnCellJuicyBlast(r, c, color) {
    const center = getCellCenter(r, c);
    const count = 14;
    // 1. Shard particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 3 + Math.random() * 5.5;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 8 + 4,
        color,
        alpha: 1,
        life: 1,
        spin: (Math.random() - 0.5) * 0.2,
        rotation: 0
      });
    }

    // 2. Star sparkles
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      starSparkles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 10 + 6,
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
      scale: 1.4,
      vy: -2.2,
      color
    });
  }

  function updateScoreDisplay() {
    currentScoreEl.textContent = score;
    // Bouncy scale effect on score increase
    currentScoreEl.style.transform = 'scale(1.18)';
    setTimeout(() => {
      currentScoreEl.style.transform = 'scale(1)';
    }, 120);

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
    }, 450);
  }

  function restartGame() {
    board = createEmptyBoard();
    score = 0;
    combo = 0;
    isGameOver = false;
    historyStack = [];
    particles = [];
    starSparkles = [];
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

  // Layout Calculation
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

    const padding = 16;
    const availableWidth = width - padding * 2;
    const boardSize = Math.min(availableWidth, height * 0.58);
    metrics.boardSize = boardSize;
    metrics.boardX = (width - boardSize) / 2;
    metrics.boardY = 12;
    metrics.cellGap = 4;
    metrics.cellSize = (boardSize - metrics.cellGap * (GRID_SIZE - 1)) / GRID_SIZE;

    // Dock Metrics
    metrics.dockY = metrics.boardY + boardSize + 16;
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

  // DRAWING: 3D Beveled Toy Block Engine
  function drawRoundedRectPath(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawStar(context, cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    context.save();
    context.globalAlpha = alpha;
    context.beginPath();
    context.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      context.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      context.lineTo(x, y);
      rot += step;
    }
    context.lineTo(cx, cy - outerRadius);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.restore();
  }

  /**
   * Renders a juicy, glossy 3D toy block cell with 4 beveled facets and specular highlight
   */
  function draw3DBlockCell(context, x, y, size, color, alpha = 1, isGhost = false) {
    context.save();
    context.globalAlpha = alpha;

    const cornerRadius = Math.max(3, size * 0.16);
    const bevel = Math.max(3, size * 0.18);

    // 1. Drop shadow under block
    if (!isGhost) {
      context.save();
      drawRoundedRectPath(context, x, y + 2, size, size, cornerRadius);
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      context.fill();
      context.restore();
    }

    // 2. Base rounded block fill
    drawRoundedRectPath(context, x, y, size, size, cornerRadius);
    context.fillStyle = color;
    context.fill();

    if (!isGhost) {
      // 3. Four 3D Bevel Facets
      // Top facet (brightest light reflection)
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + size, y);
      context.lineTo(x + size - bevel, y + bevel);
      context.lineTo(x + bevel, y + bevel);
      context.closePath();
      context.fillStyle = 'rgba(255, 255, 255, 0.45)';
      context.fill();

      // Left facet (soft light reflection)
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + bevel, y + bevel);
      context.lineTo(x + bevel, y + size - bevel);
      context.lineTo(x, y + size);
      context.closePath();
      context.fillStyle = 'rgba(255, 255, 255, 0.22)';
      context.fill();

      // Right facet (side ambient shadow)
      context.beginPath();
      context.moveTo(x + size, y);
      context.lineTo(x + size, y + size);
      context.lineTo(x + size - bevel, y + size - bevel);
      context.lineTo(x + size - bevel, y + bevel);
      context.closePath();
      context.fillStyle = 'rgba(0, 0, 0, 0.22)';
      context.fill();

      // Bottom facet (deep 3D bevel shadow)
      context.beginPath();
      context.moveTo(x, y + size);
      context.lineTo(x + bevel, y + size - bevel);
      context.lineTo(x + size - bevel, y + size - bevel);
      context.lineTo(x + size, y + size);
      context.closePath();
      context.fillStyle = 'rgba(0, 0, 0, 0.40)';
      context.fill();

      // 4. Inner Cushion Face
      const innerX = x + bevel;
      const innerY = y + bevel;
      const innerSize = size - bevel * 2;
      drawRoundedRectPath(context, innerX, innerY, innerSize, innerSize, cornerRadius * 0.6);
      context.fillStyle = color;
      context.fill();

      // Subtle inner gradient
      const grad = context.createLinearGradient(innerX, innerY, innerX, innerY + innerSize);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      context.fillStyle = grad;
      context.fill();

      // 5. Specular Gloss Dot / Pill Highlight
      const glossSize = Math.max(2, size * 0.12);
      context.beginPath();
      context.arc(innerX + glossSize * 1.1, innerY + glossSize * 1.1, glossSize, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.85)';
      context.fill();
    } else {
      // Ghost block outline & pulse
      context.lineWidth = 2.5;
      context.strokeStyle = '#fde047';
      context.stroke();
    }

    context.restore();
  }

  // Render Loop
  function render() {
    ctx.clearRect(0, 0, metrics.width, metrics.height);

    ctx.save();
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      screenShake = Math.max(0, screenShake - 1.4);
    }

    // 1. Draw 8x8 Board Outer Tray Container
    const boardRadius = 18;
    drawRoundedRectPath(ctx, metrics.boardX - 8, metrics.boardY - 8, metrics.boardSize + 16, metrics.boardSize + 16, boardRadius);
    ctx.fillStyle = '#0a1024';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e3a8a';
    ctx.stroke();

    // 2. Draw Board Sockets (Recessed 3D holes)
    const cellSizeWithGap = metrics.cellSize + metrics.cellGap;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = metrics.boardX + c * cellSizeWithGap;
        const cy = metrics.boardY + r * cellSizeWithGap;

        // Recessed socket background
        drawRoundedRectPath(ctx, cx, cy, metrics.cellSize, metrics.cellSize, 6);
        ctx.fillStyle = '#101c40';
        ctx.fill();

        // Inset socket shadow border
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#1d2d5a';
        ctx.stroke();

        // Filled 3D Toy Block
        if (board[r][c] !== null) {
          draw3DBlockCell(ctx, cx, cy, metrics.cellSize, board[r][c]);
        }
      }
    }

    // 3. Draw Placement Preview Ghost
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
            draw3DBlockCell(ctx, cx, cy, metrics.cellSize, drag.piece.color, 0.55, true);
          }
        }
      }
    }

    // 4. Draw Dock Tray & Available Pieces
    metrics.dockSlots.forEach((slot, index) => {
      // Tray Slot Capsule
      drawRoundedRectPath(ctx, slot.x + 4, slot.y + 4, slot.width - 8, slot.height - 8, 16);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = (drag.selectedSlot === index) ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      const piece = dock[index];
      if (piece && (!drag.active || drag.slotIndex !== index)) {
        const canFit = canPieceFitAnywhere(piece.matrix, board);
        drawDockPiece(ctx, piece, slot.centerX, slot.centerY, canFit ? 1 : 0.35);
      }
    });

    // 5. Draw Actively Dragged Piece with Glowing Aura & Star Sparkles
    if (drag.active && drag.piece) {
      const pieceMatrix = drag.piece.matrix;
      const numRows = pieceMatrix.length;
      const numCols = pieceMatrix[0].length;
      const pieceCellSize = metrics.cellSize;
      const pieceWidth = numCols * (pieceCellSize + metrics.cellGap);
      const pieceHeight = numRows * (pieceCellSize + metrics.cellGap);

      const startX = drag.pointerX - pieceWidth / 2;
      const startY = drag.pointerY + drag.touchOffsetY - pieceHeight / 2;

      // Glowing aura behind dragged piece
      ctx.save();
      ctx.shadowColor = drag.piece.color;
      ctx.shadowBlur = 20;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (pieceMatrix[r][c] === 1) {
            const bx = startX + c * (pieceCellSize + metrics.cellGap);
            const by = startY + r * (pieceCellSize + metrics.cellGap);
            draw3DBlockCell(ctx, bx, by, pieceCellSize, drag.piece.color, 1);
          }
        }
      }
      ctx.restore();

      // Spawn periodic trail sparkles while dragging
      if (Math.random() < 0.25) {
        starSparkles.push({
          x: drag.pointerX + (Math.random() - 0.5) * pieceWidth,
          y: drag.pointerY + drag.touchOffsetY + (Math.random() - 0.5) * pieceHeight,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random() * 2,
          size: Math.random() * 8 + 4,
          alpha: 1,
          life: 1
        });
      }
    }

    // 6. Draw Sparkle Stars
    for (let i = starSparkles.length - 1; i >= 0; i--) {
      const s = starSparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.04;
      s.alpha = Math.max(0, s.life);

      if (s.life <= 0) {
        starSparkles.splice(i, 1);
        continue;
      }

      drawStar(ctx, s.x, s.y, 4, s.size * s.life, s.size * 0.4 * s.life, '#fde047', s.alpha);
    }

    // 7. Draw Blasting Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.035;
      p.alpha = Math.max(0, p.life);
      p.rotation += p.spin;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      drawRoundedRectPath(ctx, -p.size / 2, -p.size / 2, p.size, p.size, 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Draw Floating Cartoon Combo Badges
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
      ctx.font = `900 ${Math.round(20 * ft.scale)}px 'Fredoka', -apple-system, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    requestAnimationFrame(render);
  }

  function drawDockPiece(context, piece, centerX, centerY, alpha = 1) {
    const numRows = piece.matrix.length;
    const numCols = piece.matrix[0].length;
    const miniCellSize = Math.min(24, metrics.cellSize * 0.58);
    const miniGap = 3;

    const totalW = numCols * miniCellSize + (numCols - 1) * miniGap;
    const totalH = numRows * miniCellSize + (numRows - 1) * miniGap;
    const startX = centerX - totalW / 2;
    const startY = centerY - totalH / 2;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (piece.matrix[r][c] === 1) {
          const x = startX + c * (miniCellSize + miniGap);
          const y = startY + r * (miniCellSize + miniGap);
          draw3DBlockCell(context, x, y, miniCellSize, piece.color, alpha);
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

    const col = Math.round((pieceTopLeftX - metrics.boardX) / cellSizeWithGap);
    const row = Math.round((pieceTopLeftY - metrics.boardY) / cellSizeWithGap);

    const canPlace = canPlacePiece(piece.matrix, row, col, board);
    return { row, col, canPlace };
  }

  function handlePointerDown(e) {
    if (isGameOver) return;
    const { x, y } = getCanvasCoordinates(e);

    const slotIdx = getSlotAtPosition(x, y);
    if (slotIdx !== -1 && dock[slotIdx] !== null) {
      const piece = dock[slotIdx];
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

    score += placedCellsCount;
    updateScoreDisplay();

    dock[dockIndex] = null;

    if (window.ViggaAudio && typeof window.ViggaAudio.playMove === 'function') {
      window.ViggaAudio.playMove(false);
    }

    processBoardClears();
    checkGameStateAfterMove();
  }

  function initGame() {
    bestScoreEl.textContent = bestScore;
    updateScoreDisplay();

    if (window.ViggaNav && typeof window.ViggaNav.init === 'function') {
      window.ViggaNav.init({ audioModule: window.ViggaAudio });
    }

    window.addEventListener('resize', updateMetrics);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
