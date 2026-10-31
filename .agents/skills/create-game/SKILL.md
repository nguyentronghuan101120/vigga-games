---
name: create-game
description: >-
  Interactive and autonomous workflow to scope, design, implement, and self-test
  a new web-based mini-game for Vigga Games. Enforces a strict one-by-one interview,
  monorepo shared module reuse, English-only outputs, .vscode/launch.json update,
  and automated self-playtesting.
---

# Create Game Workflow

This skill defines the end-to-end process for designing, developing, and validating new mini-games in the `vigga-games` repository.

> **CRITICAL LANGUAGE DIRECTIVE:**
> All game code, UI text, button labels, modal messages, comments, configurations, and documentation produced by this workflow MUST be **100% in English**. No other language may appear in the game interface, code, or documentation files.

---

## Phase 0: Context Discovery (MANDATORY FIRST STEP)

Before asking any questions or generating code, the AI **must** inspect and read the project context:

1. **Read `README.md`** at the workspace root to understand:
   - System architecture (HTML5 + CSS3 + Vanilla JavaScript, zero heavy frameworks).
   - Monorepo folder layout and shared modules in `/shared/` (`shell.css`, `audio.js`, `navigation.js`).
   - Existing games and the roadmap.
   - Design guidelines (clean minimalist flat pastel UI, ergonomics, responsive mobile & desktop).
2. Check existing implementations (e.g., `games/caro/`) as a reference benchmark for quality, shell header integration, and controls.

---

## Phase 1: One-by-One Scoping Interview (STRICT PROTOCOL)

The AI **MUST NOT** ask multiple questions at once. The AI must ask **exactly one question per response** and wait for the user's answer before asking the next question.

Follow this exact sequential order:

### Question 1: Concept & Core Pitch
> *"What is the name of the game and its primary genre (e.g., puzzle, board game, arcade, card, logic)? What is the core elevator pitch of the gameplay?"*

*(Wait for user reply)*

### Question 2: Core Loop & Win/Loss Conditions
> *"What is the main player action loop (what does the player do repeatedly)? What are the exact conditions to Win and Lose (Game Over)?"*

*(Wait for user reply)*

### Question 3: Game Modes & Mechanics
> *"What game modes are required (Solo, Local 2-Player PvP, or against an AI Bot)? Are there specific features needed like Undo, Difficulty levels, Scoring, Timer, or High Score saving?"*

*(Wait for user reply)*

### Question 4: Controls & Rendering Engine
> *"How should the player control the game (Arrow keys/WASD, mouse clicks, mobile touch/swipe gestures)? Should the visual engine be built with CSS Grid/DOM or HTML5 Canvas 2D?"*

*(Wait for user reply)*

---

## Phase 2: Implementation Standards

Once all 4 questions are answered, proceed to build the game inside `games/<game-id>/`:

1. **File Structure:**
   ```text
   games/<game-id>/
   ├── index.html       # Clean semantic HTML with Vigga shell header
   ├── style.css        # Responsive styling using /shared/css/shell.css variables
   └── game.js          # Pure vanilla ES6 game logic, zero external libraries
   ```

2. **Integration Checklist:**
   - **Shell Header:** Include the standard Vigga header with:
     - Back button (`#btn-hub` linked via `ViggaNav.init()`).
     - Undo button (`#btn-undo`) if applicable to the game mechanics.
     - Center title displaying the game name.
     - Sound toggle button (`#btn-sound`) powered by `ViggaAudio`.
     - Restart button (`#btn-restart`) for instant new game initialization.
   - **Sound Effects:** Utilize `shared/js/audio.js` methods (`playMove`, `playUndo`, `playWin`, `playGameOver`, etc.) or add non-breaking sound synthesizers if needed.
   - **Storage & State:** Persist best scores / user preferences in `localStorage` with prefix `vigga_<game-id>_`.
   - **Responsiveness:** Ensure flawless mobile experience (touch-action prevention, viewport meta, scalable board).
   - **Language:** Ensure 100% English copy across all headings, HUD, dialogs, buttons, and alerts.

---

## Phase 3: Launch Configuration Update

After creating the game files, update `.vscode/launch.json` to register the new game for debugging:

1. Read `.vscode/launch.json`.
2. Add a new Chrome launch configuration entry:
   ```json
   {
     "type": "chrome",
     "request": "launch",
     "name": "<Game Name> (Chrome)",
     "file": "${workspaceFolder}/games/<game-id>/index.html"
   }
   ```
3. Save the formatted `.vscode/launch.json`.

---

## Phase 4: Automated Self-Play & Testing

The AI must actively test the game before handing it off to the user:

1. **Syntax Validation:**
   Run `node -c games/<game-id>/game.js` to ensure zero syntax errors.
2. **Resource & Selector Check:**
   Verify relative paths to `../../shared/css/shell.css`, `../../shared/js/audio.js`, and `../../shared/js/navigation.js`.
3. **Automated Self-Play:**
   Execute a simulation script (or headless browser run) that:
   - Initializes the game state.
   - Simulates simulated player actions (keystrokes, clicks, or moves).
   - Verifies that state transitions, scoring, and win/loss evaluations execute without throwing runtime exceptions.
   - Ensures no infinite loops or NaN values in scores/board states.

---

## Phase 5: Delivery & Reporting

Provide a concise summary to the user containing:
- Direct local link to the game: `games/<game-id>/index.html`.
- Confirmation that `.vscode/launch.json` has been updated with `<Game Name> (Chrome)`.
- Self-play test results (moves simulated, win/loss triggers verified, zero errors).
- Brief instructions on how to test or run the game locally.

