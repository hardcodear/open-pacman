# Repository notes

- Run the game by opening `src/index.html` in a browser. There is no package manifest, build step, or configured test/lint runner; verify gameplay changes in the browser.
- `src/index.html` loads classic scripts in this order: `maze.js` → `game.js` → `render.js` → `main.js`. They share globals on `window`, not ES modules. `main.js` owns input, overlays, and the animation loop; `game.js` owns state and rules; `render.js` draws the canvas.
- Edit the maze in `src/js/maze.js` as 31 strings of 28 characters: `#` wall, `.` dot, space walkable, `-` ghost-pen door (blocks Pac-Man but not ghosts). `createGame()` copies the pristine maze into `game.grid` so eaten dots and restarts do not mutate the source. Tunnel wrapping uses row 14.
- The maze is rendered at 20 px per tile; the canvas and wrapper are fixed at 560 × 620 px in `src/index.html` and `src/css/style.css`. Keep these dimensions in sync if the grid or tile size changes.
- For the repo's spec-driven workflow, see `.agents/skills/spec/SKILL.md` and `.agents/skills/spec-impl/SKILL.md`; the implementation skill requires an approved spec and controls branch creation via `specs/.spec-config.yml` (default `AutoCreateBranch: true`).
