# Peel Works: free-board prototypes

The initial pack overconstrained the interesting part of the game. Fixed sockets and tiny allowlists made most of its two-word puzzles swap exercises. Seven of those levels are now deleted. **Shared load** is the only two-word level retained, as an optional introduction to the value of a crossing.

The catalog now leads with three larger prototypes in the full Peel editor. Nine fixed-footprint warm-ups remain below them. Existing warm-up progress stays in browser storage; removing a level does not erase its recorded history.

## Playable prototypes

| Work order | Starting board / delivery | Acceptance conditions | Search evidence |
|---|---|---|---|
| Q delivery | 21 tiles, seven valid runs; Q/U/Z in the rack | Use all 24 tiles, include QUIZ, change at most 14 original positions | Ten complete layouts found in the construction family; one meets the budget. Its ordinary words are QUIZ, RAIN, STAR, NOTES, NOTE, EAST, TEA, ATE. |
| Compact without sacrifice | 33 tiles, seven valid runs | Hull fill ≥51%, retain STONES and four runs of at least six letters, change at most 14 original positions | 485 complete family layouts; two meet the target and budget. Observed tradeoffs: 47% at 11 changed, 51% at 14, 53% at 19. |
| Keep the pond | 25 tiles, seven valid runs; 12 anchored courtyard tiles | Enclosed hull ≥60%, preserve a pond of at least four cells and a six-letter run, change at most eight original positions | 16 complete family layouts; two meet the target. Observed tradeoffs: 52% at four changed, 60% at six changed. The starting board is 51%. |

Each prototype has a finite, visible manifest—138, 269, and 257 words respectively. These are ordinary words and inflections filtered by the exact bank, rather than a manifest restricted to the witness's seven or eight runs. By default, there are no two-letter words and the same fixed allowlist governs auto-check and acceptance. The persistent **Use challenge allowlist** toggle can instead select the player's normal dictionary and tier cutoff, including their allowed two-letter words. Geometry, inventory, anchors and budgets remain enforced. Connectivity and accepted words appear as separate conditions, so either can pass independently. Saved submissions and QA events identify the word-rule mode.

Placements are free within x/y −9…14. The footprint may change, holes may open and close, and words can be replaced by other allowed words. The pond's twelve marked letters are anchored only as submission constraints: temporary violations are allowed, so group moves and undo remain usable.

## Cost and scoring

Cost counts original board positions that no longer contain the same letter. Equal copies of a letter are interchangeable. New delivery tiles add no cost unless an original position loses its letter. Cost is assessed at submission; intermediate moves do not spend a resource. All tiles must be placed, the exact bank must be conserved, and every run must be valid on one connected board.

Hull and enclosed-hull percentages use the existing game's scoring and rounding. Enclosed hull counts occupied cells plus all enclosed gaps, including one-cell gaps. The separate pond condition uses regions of at least four cells. Hovering the live objective uses the same hull/cave inspection as ordinary play.

The live pane lists each acceptance condition. **Submit** records valid arrangements satisfying the structural constraints and budget, even if they have not reached the geometry target. Submissions store score, changed positions, and the complete board; players can restore and compare them. Reset, restoring a submission, and loading the optional verified example are undoable. Nothing automatically replaces the player's board with a solver suggestion.

Each prototype saves to a dedicated `peel-work-order-<id>-v<version>` key. The normal `peel-game` position is preserved. Work-order actions use the main uncapped history archive and include their work-order ID. Entering a work order marks a new replay segment. The older standalone warm-ups retain their separate IndexedDB history store.

## What the search does and does not prove

`npm run prototypes` runs the deterministic exploratory construction search and rebuilds the definitions/catalog. It writes the complete explored layouts to the ignored local file `artifacts/prototype-exploration.json`. The checked-in definitions include witnesses, family counts, stage counts, and observed score/change frontiers, so a normal production build does not need to rerun the search.

The search attaches complete words to an existing matching letter, in either forward orientation, rejecting collisions, inventory overuse, and invalid incidental runs. Some stages consider familiar anagrams, such as GARDEN / DANGER / GANDER / RANGED and PLATES / STAPLE / PLEATS / PASTEL / PETALS. It aligns layouts to the starting board to minimize changed original positions. Courtyard searches keep their base fixed. States have a deterministic 10,000-state stage cap, with generated and retained counts disclosed; no stage of these three searches hit that cap.

**This is not an enumeration of the playable solution space.** Fixed initial words, insertion order, stage vocabulary, and the requirement for valid intermediate constructions restrict the searched family. The player's manifest and placement freedom are much broader. Targets have verified feasible witnesses; the global optimum, number of solutions, and globally minimum edit distance remain unknown. A sampled frontier describes observed tradeoffs, not a proven Pareto frontier.

This distinction is intentional. The search should help reject impossible goals and identify interesting tradeoffs, without turning every prototype into a tiny puzzle whose only answer is embedded in the allowlist. Human playtesting is still needed to judge whether the budgets and goals are enjoyable.

## Remaining warm-ups

The retained levels are Nine sockets, Ore processing, Sea of letters, Red line, Courtyard, Four-square pond, Solid state, Shared load, and Four voices. They still use fixed sockets, exact visible manifests, and exhaustive letter-assignment enumeration. `public/challenges/analysis.json` contains their complete feasible states and exact counts. Each remains a standalone offline HTML file.

Deleted: Crossed wires, Dog leg, Q branch, Tax exchange, Earth exchange, Heavy freight, Budget freight. The build explicitly removes these generated files, so stale copies cannot remain in the local catalog or deployment.

## Verification

`npm test` validates every prototype witness with the shared rules and existing game validator, verifies anchors/banks/bounds/rack requirements, and checks cost independence from tile IDs. Warm-up tests still independently brute-force every multiset permutation for boards of nine tiles or fewer and compare the complete valid state set to the CSP.

`node browser-check.js --prototypes` exercises rack delivery, group movement, floating keyboard moves, undo, submission acceptance, verified examples, separate persistence, catalog navigation and mobile layout. `--challenges` checks the remaining standalone warm-ups. The ordinary main-game browser suite checks regressions in the shared editor.
