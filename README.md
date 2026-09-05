# Peel

A playable, relaxed Bananagrams-inspired solo game. Built with vanilla JavaScript and Vite.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. Click **Watch the demo** to build a complete 33-tile board: seven starting words using 21 tiles, followed by twelve individual peels. Each peel shows the drawn letter in the rack before placing it. Pause, restart, or step through manually. Editing the demo board lets you take over; starting the demo again rebuilds it safely.

**New game** offers a shuffled 33-tile short round or the standard 144-tile distribution. Place all rack tiles into one connected crossword, and peel. Words are checked automatically after every edit; switch off **Auto-check** to experiment without highlights. Your preference is saved. Peeling always validates the board. With an empty bunch and a valid board, Finish completes the round. Dump exchanges one selected tile from the rack or board for three from the bunch. The current board automatically saves in this browser.

**Watch moves, swaps & selections** runs a captioned input tour on the sample board. It demonstrates click-to-move with a ghost, swapping after picking up a tile, double-click word selection, floating a group over occupied cells, undo, and marquee selection starting inside a tile. Pause or use Next to inspect each step. Starting the tour saves your previous position in Undo.

**Save / load** exports a JSON file or a copyable `PEEL1.…` position code. The code contains board coordinates, rack tiles, and the remaining bunch in draw order; it needs no server lookup. Import accepts either format, validates it before replacing the board, and is undoable. Dictionary preferences remain local; loading ends an active scoring run.

The **Words** manager lets a player add a missing word, hide an unwanted bundled word, and restore either choice later. These overrides are local to the browser and update Auto-check immediately.

The board score combines commonness relative to word length (40%), longest word (15%), and shape (45%). Commonness is the percentile of frequency within each word's length, using the bundled frequency list: VERACITY is #2,913 of 6,544 eight-letter words, scoring 55 rather than the former global logarithmic score of 8. Missing frequency data scores 0. The separate length metric gives 12.5 points per letter after the second, capped at 100 for words of ten or more letters. Commonness averages by letter count; the length reward uses only the longest word, so shorter crossings do not dilute it. Shape now combines convex-hull fill (60%), solid core (15%), and ponds (25%). Hull fill is occupied tile count divided by the continuous area of the convex hull of whole unit tile squares, including fractional empty space along diagonal edges. This avoids zero-area hulls for lines or single tiles. Solid core awards four points per cell in the largest completely filled rectangle, capped at 100. Pond rank is the number of enclosed empty regions with at least four cells, using cardinal connectivity. Corner-sealed ponds count equally. The score shows every component and each word's within-length rank. Suggestions prefer longer words using global frequency to order words of the same length.

Score replaces the demo and tips in the existing right-hand rail without changing the board dimensions, zoom, or pan: keep moving tiles while its values update. Whether the score pane is open is remembered across reloads and development updates. Hover or keyboard-focus Hull fill or Solid core to outline the exact scored region. Box and diamond fill remain available under Other shape and word metrics for comparison, but no longer contribute to the base score. The diamond follows the grid cells of the smallest L1 ball, with its center marked; centers and radii may be half-integers, so it can tighten between tiles. The denominator counts the actual included grid cells. Enclosed hull is a separate metric counting tiles plus enclosed gaps of every size, divided by hull area. Its inspection shades the complement: open caves inside the hull, including fractional space along diagonal edges, excluding tiles and enclosed gaps. It does not contribute to the base score. Hull inspection marks each full boundary side at its midpoint, or isolated corner contacts with a corner dot. Ponds shades the qualifying empty regions in blue and labels their areas. Pond Keeper rewards pond count; Pond Area rewards total enclosed area; Great Lake rewards the largest pond. Word rows highlight their tiles; Longest word highlights only the longest words, including ties. Experimental metrics show the sum of squared plain Scrabble word values, and the best axis-aligned rectangle by occupied² / area. Hover the rectangle metric to outline its exact extent. These metrics are separate from the base score. Shared letters count in each Scrabble-scored word; no board premiums apply.

The score panel also starts a five-stage optimization run. Each stage offers three choices from 30 scoring modifiers covering density, ponds, crossings, direction, word length, letter variety, vowel balance, palindromes, and other board traits. Word Power adds the squared Scrabble sum divided by 100, rounded to points. One rule is added per stage, the rules stack, and a stage can be banked once the connected valid board is empty of rack tiles and meets its target. The following stage peels one letter directly into the hand.

The local **QA** journal records semantic actions and resulting board states, including exact marquee rectangles, where a marquee started, selected tile IDs and coordinates, group movement, swaps, dumps, keyboard floating, panning, and validation settings. Add a timestamped note when something feels unintuitive, then copy a readable report or download the JSON. Recording can be paused or cleared. Nothing is transmitted automatically; at most 200 events are retained in browser storage.

## Board controls

When Auto-check finds disconnected groups, smaller groups get colored boundaries and numbers, including singletons. The largest group stays unoutlined while editing. A peel blocked by disconnected groups briefly flashes every boundary. Outlines disappear when the board reconnects.

**Free** marks tiles that can be lifted individually without splitting their connected group or making a changed word invalid. Lone letters are allowed; unchanged spelling errors and disconnected pieces elsewhere do not block the helper. Badges and the count update after edits and dictionary changes. Lift one tile at a time: several individually free tiles may not be safe to remove together.

- Drag a tile, or click it and then an empty board cell. A cursor ghost previews the destination. Click a selected tile again to deselect it.
- Double-click a tile to select its word; double-click again to switch to the crossing word.
- Shift-click to add/remove individual tiles. Select mode lets you start a box anywhere, including inside a tile; touching any part of a tile includes it. Completing a selection returns to Move so you can immediately drag the group.
- Drag a selection, or use arrow keys to float it across the board, including over occupied cells. Enter commits at a free destination; Escape cancels. No tiles are overwritten.
- Space picks up an existing rack tile, or peels a new letter directly into your hand when the rack is empty. Move over the board and click to place it.
- With a tile already in hand, press X for Swap, or hold Alt while hovering a destination. Click to exchange tiles. A rack swap leaves the displaced letter in your hand. Swaps are undoable.
- With no tile selected, arrow keys or WASD pan the board one tile at a time.
- Find highlights every copy of one letter, or every horizontal and vertical occurrence of an n-gram. Enter and Shift+Enter cycle through matches; F or Cmd/Ctrl+F opens Find. Escape closes it.
- Suggest previews a valid play using letters from your rack. Click **Place idea** to accept it, or interact with the board to dismiss it.
- Delete/Backspace returns selected board tiles to the rack; dragging to the rack also works.
- Z or Cmd/Ctrl+Z undoes moves, peels, dumps, and new games. Y or Cmd/Ctrl+Shift+Z redoes. Typing in text fields does not trigger game shortcuts.
- V: move. X: swap. H: pan. Escape: cancel/clear selection.
- Zoom controls and Fit keep larger boards manageable.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser  # with the dev server running
```

Optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium binary. Browser checks cover the complete demo, selection and movement, the board finder, scoring modifiers and optimization-run setup, the QA journal, dictionary overrides, scoring, keyboard panning, collision rejection, undo/redo, suggestions, rack placement, edge-touch selection, keyboard collision traversal, swap gestures, Space-to-peel, automatic checking and its opt-out, board/rack dumping, game rules, persistence, and mobile overflow. Screenshots are saved to `artifacts/`.

The bundled English dictionary comes from the MIT-licensed `word-list` package; its license is included in `public/WORD-LIST-LICENSE.txt`. It includes inflections but is not an official tournament dictionary. Commonness ranks come from the ISC-licensed `popular-english-words` package, based on 2021 English Wikipedia usage. Run `npm run dictionary` to regenerate both data files. No backend or external dictionary service is required; Google Fonts is optional and falls back to system sans-serif.

Strongest word measures the maximum plain Scrabble value of a word and highlights tied winners. The Heavyweight modifier awards this value as bonus points. Woven region measures the largest connected group of occupied tiles belonging to runs of at least three letters both across and down; empty gaps never count. Inspection highlights the two largest regions (including ties), plus any others at least 80% of the largest. Other rectangle and word experiments are collapsed by default.

In the development server, live local sharing saves each browser’s current board, dictionary overrides, and active modifiers in `artifacts/live-boards/<client-id>.json`, including a receipt timestamp. This lets the assistant inspect the current position directly. Save/load contains an opt-out toggle and a one-time share button. Nothing is sent to an external service. Automated browsers default to sharing off.

## Share a board

Save / load → **Download board & metrics HTML** creates one standalone file you can send to someone. It opens offline, with interactive metric highlights, the board code, a frozen scoring snapshot, and a download of board/metrics JSON. It includes custom dictionary preferences and active modifiers. It is an inspectable snapshot; to edit tiles, import its board code into the game. Local QA recordings are not included.

Run the full game with `npm install` and `npm run dev`. `npm run build` creates a static site in `dist/`. The public repository does not include local board snapshots, exports, or QA recordings.
