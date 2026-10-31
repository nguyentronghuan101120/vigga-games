# Vigga Mini-Games — Monorepo Architecture & Decisions

This document summarizes the technical decisions, system architecture, and development roadmap for the standalone web mini-games connected to the central **Game Hub** ([vigga.netlify.app](https://vigga.netlify.app/)).

---

## 1. Project Objectives & Principles

* **Objective:** Build a curated collection of standalone puzzle, board, and intellectual arcade mini-games. Each game is accessible via an **independent web link**.
* **Central Hub:** [vigga.netlify.app](https://vigga.netlify.app/) (contains the master game catalog; each standalone game URL is mapped in `games.js`).
* **Player Experience:** Instant load time (< 0.5s), responsive on both Mobile and Desktop, clean minimalist aesthetics, zero friction.

---

## 2. Technical Architecture & Decisions

### 2.1. Deployment: **Vercel (Mono-Deployment)**
* **Deployment Model:** The entire repository is deployed as a single project on Vercel (`vigga-games.vercel.app`).
* **Key Advantages:**
  * Direct reusability of shared modules (`/shared/css/shell.css`, `/shared/js/audio.js`, `/shared/js/navigation.js`) without build tools or duplicate code.
  * Independent static web route for each game:
    * Caro (Gomoku): `https://vigga-games.vercel.app/games/caro/`
    * Subsequent games: `/games/<game-id>/`
* **Hub Linking:** Assign the corresponding live URLs to `games.js` in the primary Vigga Hub repository.

### 2.2. Core Technology Stack: **HTML5 + CSS3 + Vanilla JavaScript**
* **Standard:** Zero heavy front-end frameworks (no React, Next.js, or Vue) to prevent build bloat, lock-in, and dependency overhead.
* **Rendering Engines:**
  * **DOM Grid (CSS Grid + Flexbox):** For static grid-based board games (Caro, Wordle, Sudoku, Queens).
  * **HTML5 Canvas 2D:** For games requiring physics, particle systems, or real-time animations (Tetris, Block Blast, Water Sort).
* **Audio Synthesis:** Web Audio API (`shared/js/audio.js`) for procedural sound effects without external audio assets.

### 2.3. Design Language: **Clean Flat / Minimalist**
* **Design Influences:** Wordle (NYT), 2048, and LinkedIn Games (Queens, Tango, Pinpoint).
* **Visual Palette:** Soft pastel tones, ergonomic contrast ratios, smooth border radii, flat iconography.
* **Standard Shell Navigation:**
  * `Back to Hub` button (pointing to `https://vigga.netlify.app/`).
  * `Undo` action button (where applicable).
  * `Sound Toggle` (Mute / Unmute persisted in `localStorage`).
  * `Restart / New Game` primary action button.

---

## 3. Monorepo Structure

```text
vigga-games/
├── README.md                # System documentation & architectural roadmap
├── Makefile                 # Deployment shortcuts
├── .gitignore               # Ignored files and artifacts
├── .vscode/
│   └── launch.json          # Chrome debugging configurations
├── .agents/
│   └── skills/
│       └── create-game/     # Autonomous game creation workflow
│           └── SKILL.md
├── shared/                  # Common resources across all mini-games
│   ├── css/
│   │   └── shell.css        # Common top header, color variables, typography
│   └── js/
│       ├── audio.js         # Lightweight Web Audio API synthesizer
│       └── navigation.js    # Shell navigation and hub redirect logic
└── games/
    ├── caro/                # Game 1: Caro (Gomoku) 15x15 (DOM Grid + AI Bot)
    │   ├── index.html
    │   ├── style.css
    │   └── game.js
    └── block-blast/         # Game 2: Block Blast 8x8 (Canvas 2D + Combos + Sound)
        ├── index.html
        ├── style.css
        └── game.js
```

---

## 4. Game Specifications

### Game 1: Caro (Gomoku)
* **Board Dimensions:** 15x15 grid with standard star points (Tengen & 8 Star marks).
* **Rules:** Free Gomoku — Any contiguous row of 5 stones (horizontal, vertical, or diagonal) wins immediately.
* **Turns:** Player (X) moves first by default.
* **Modes:**
  1. `Player vs Player (Local PvP)`: Shared device alternating turns.
  2. `Player vs Bot (AI)`: 3 difficulty levels (**Easy**, **Medium**, **Hard**) with heuristic board evaluation.
* **Features:**
  * Undo support.
  * Pan & Zoom controls for mobile screens.
  * Procedural move and victory audio via Web Audio API.

### Game 2: Block Blast
* **Board Dimensions:** 8x8 grid.
* **Rules:** Place polyomino blocks from the dock of 3 onto the board. Clearing any complete horizontal row or vertical column blasts the blocks and scores points.
* **Modes:** Solo Endless High-Score mode with combo multipliers.
* **Features:**
  * Canvas 2D engine with 60 FPS particle blast effects and subtle screen shake.
  * Pointer & touch drag-and-drop with ergonomic thumb offset, plus tap-to-place accessibility.
  * Undo support via Vigga header.
  * Persistent high score in `localStorage` (`vigga_block-blast_best_score`).
  * Procedural move, combo blast, and game over sounds via `ViggaAudio`.

---

## 5. Automated Game Development Workflow

New games can be created using the autonomous `.agents/skills/create-game` workflow:

1. **Trigger:** Invoke `create game` or `/create-game`.
2. **Context Discovery:** The agent automatically reads `README.md` first.
3. **Structured Scoping:** The agent conducts a strict one-by-one interview covering:
   - Pitch & Genre.
   - Core Loop & Win/Loss Conditions.
   - Game Modes & Mechanics (Bot, PvP, Undo, Scores).
   - Controls & Engine (DOM vs Canvas).
4. **Implementation:** Generates standard `games/<game-id>/` files adhering to 100% English UI and code conventions.
5. **Launch Registration:** Automatically appends debugging configurations to `.vscode/launch.json`.
6. **Automated Self-Play:** The agent runs and simulates gameplay to verify error-free execution before delivery.

---

## 6. Deployment Instructions

1. **Deploy to Vercel:**
   ```bash
   make deploy
   # Or directly:
   npx vercel --prod
   ```

2. **Link Verification:**
   Test the deployed route at `https://<project-id>.vercel.app/games/<game-id>/` and link it to the central Game Hub.
