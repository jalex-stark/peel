# Peel Works 01: The Junction Pack

Sixteen playable, standalone HTML work orders. Open `/challenges/` from the game’s **Work orders** link. Each level can also be downloaded and opened offline. This is a first pack of small, completely characterized puzzles—not a claim that large free-board optimization is solved.

The engineering analogy is a fixed machine with letters as cargo and crossings as junctions. Repairs restore a damaged starting layout. Optimization boards start valid but below a proven target. The constrained vocabulary removes obscure-word hunting; the hard part is satisfying overlapping constraints or moving letter value to useful positions.

## Rules that make experiments cheap

- Every socket is filled; only supplied letters may be used. Click two tiles, drag to swap, or select/swap with keyboard focus and Enter.
- Every maximal horizontal and vertical run must be in the visible per-level allowlist. No hidden dictionary, customization, extra tiles, or unused rack. Repeated words are legal.
- Footprints are fixed, connected, and include crosses, completely woven squares, and hollow courtyards. A hole cannot be filled. Dots identify anchored tiles.
- Cost is final **letter-at-socket Hamming distance**, not interaction count or labelled tile identity. Swapping two identical letters costs zero. A swap of different letters usually changes two sockets. Moving a group of letters does not cost “one move.”
- Intermediate invalid words and over-budget layouts are allowed. Undo/redo is unlimited by design; an undo never spends a budget. Reset is itself undoable.
- Repair acceptance is any valid board within budget. Its displayed word statistic is secondary. Optimization acceptance additionally requires the target. Score is always visible, even for invalid experiments; only legal attempts can be accepted.
- Strongest word means maximum plain Scrabble value. Squared word values sum each run’s value squared. Shared letters count in both words. Distinct words counts unique spellings.
- Progress and accepted bests save per level, independently of the main game. Semantic action history is append-only in IndexedDB with no event-count cap; downloads include full level data and resulting states. Storage failure is surfaced. These separate challenge histories are local to the browser, not automatically mirrored to the main game’s development-server archive.
- A hint marks the next two tiles on a verified swap route without moving them. Report/hint use is marked locally as assisted. Attempts are portable `PEELWORKS1.` codes. Offline files are inspectable: there is deliberately no anticheat claim.

## What the enumeration establishes

`engine.js` extracts word slots from the footprint. Its exhaustive CSP assigns the remaining slot with the fewest compatible allowed words. At each branch it respects existing crossing letters and consumes only newly assigned letters from the exact bank. Once every slot is assigned and all sockets are filled, the assignment is recorded. A set removes duplicate paths. There is no search timeout, solution limit, or heuristic truncation.

The finite space is **all letter assignments to the labelled sockets in that level**, modulo identical copies of letters. Legal rotations and reflections count separately. We then filter for anchors and final-change budget. This does not enumerate free placements elsewhere on an unbounded board, alternate footprints, or words outside the allowlist.

`public/challenges/analysis.json` contains every feasible arrangement, its words, distance and metrics; total/anchored/feasible counts; a distance histogram; exact optimum and number attaining it; and the nondominated score/change frontier before budget filtering. The player embeds the same report, so inspection and hints work offline.

An independent test enumerates every multiset permutation for every board of nine tiles or fewer, and checks it through the existing game's `validate` function. Those complete solution sets must agree with the CSP. All larger-board witnesses are checked with the existing validator and scoring functions. Every hint route is tested from the start and every feasible solution. Browser checks actually solve all 16 levels with click/swaps, then test persistence, drag, undo/redo, report display, exported files and import.

Rebuild deterministically: `npm run challenges`. Run the mathematical checks with `npm test`, browser interaction checks with `node browser-check.js --challenges`. The normal production build regenerates all artifacts.

## Work order analysis (spoilers)

“Total” counts valid assignments before anchors and budget. “Feasible” applies both. Dense single-solution boards are intentionally **repairs**, never fake optimizations. Their required vocabulary is familiar: CAT / ARE / TEN, DOG / ORE / GET, SEA / EAR / ART, CAR / ARE / RED, and BALL / AREA / LEAD / LADY. Allowlist distractors are themselves finite and visible (2–26 words per level).

| # | Work order | Tiles | Task | Total | Feasible | Design point |
|---|---|---:|---|---:|---:|---|
| 01 | Crossed wires | 5 | Repair, budget 2 | 4 | 1 | One swap repairs the crossing; budget distinguishes orientations. |
| 02 | Dog leg | 5 | Repair, budget 4; centre anchored | 4 | 4 | Forgiving variant teaches anchors and multiple acceptable answers. Minimum distance is 2, not 4. |
| 03 | Q branch | 7 | Repair, budget 4 | 2 | 1 | Weird bank with two Qs, but only QUIZ and QUIT are allowed. |
| 04 | Tax exchange | 9 | Squared values → 288 | 2 | 2 | Moving X into the crossing replaces STATE / EXTRA with EXTRA / TAXES. Starts at 169. |
| 05 | Earth exchange | 9 | Squared values → 125 | 8 | 8 | Redistribute value: EATER / SHARP beats more balanced pairs (113). |
| 06 | Nine sockets | 9 | Repair, budget 4 | 2 | 1 | Dense crossings and a budget constrain orientation. |
| 07 | Ore processing | 9 | Repair, budget 4 | 1 | 1 | A tightly constrained ordinary-word square. |
| 08 | Sea of letters | 9 | Repair, budget 4 | 1 | 1 | Repeated letters reduce permutations; six runs still constrain each other. |
| 09 | Red line | 9 | Repair, budget 4 | 1 | 1 | Another compact repair with a seven-word manifest. |
| 10 | Courtyard | 8 | Repair, budget 4 | 7 | 2 | An empty centre weakens weaving and opens alternative solutions. Both accepted. |
| 11 | Four-square pond | 12 | Repair, budget 6 | 1 | 1 | Four empty cells; only BALL and LADY are allowed. |
| 12 | Solid state | 16 | Repair, budget 6 | 1 | 1 | Full 4×4, eight constrained runs; the dense capstone. |
| 13 | Heavy freight | 5 | Strongest word → 7 | 12 | 12 | CAP concentrates C and P; CAR / PAT spreads their value and scores only 5. Four arrangements reach target. |
| 14 | Shared load | 7 | Squared values → 98 | 12 | 12 | LEFT / SAFE makes F the crossing. Starts at 65; two optimal orientations. |
| 15 | Budget freight | 9 | Squared values → 146, budget 5 | 7 | 3 | Five final changes exactly suffice to reach PARKS / TEASE. Tests the score/change tradeoff. |
| 16 | Four voices | 8 | Distinct words → 4 | 7 | 7 | Start has CAT / CAT / TEN / TEN. Break the symmetry to get four different words. |

The displayed known optimum is a goal, not a concealed grading scale. This keeps optimization work directed. Reports are spoiler-gated; completing a level does not require inspecting them.

## Where the next pack should go

The fixed footprints deliberately hold hull, density and pond area constant. Using those as objectives here would be meaningless. Future geometry work orders should instead supply a bounded build region with optional sockets, an exact bank, and perhaps anchored boundary tiles. Enumerate occupied masks as well as letter assignments. Prove counts only for the stated finite region; for larger regions, explicitly report the best witness and an upper bound rather than call an unproved score optimal.

Three promising next families:

1. **Dock expansion:** keep an existing word anchored, add 2–4 known letters, and maximize hull fill while changing at most three existing sockets. Require the measured improvement to exceed the starting score, so submitting the starting board cannot pass.
2. **Courtyard planning:** choose where the holes go inside a small fenced area. Optimize enclosed hull coverage or pond area, with occupied area fixed. This separates useful enclosures from open caves.
3. **Tournament orders:** keep a larger curated letter bank and publish the Pareto frontier of score versus changed sockets, instead of blending both into a weighted scalar. Support multiple saved entries and compare their tradeoffs; unknown global optima should remain labelled unknown.

For each candidate, first enumerate or bound the solution space, then pick the starting corruption, budget, and objective. Reject optimization candidates whose feasible metric is constant. Audit every word in low-solution candidates manually. Counts measure freedom, not human difficulty: browser playtesting is still needed to judge whether a unique square is elegant or merely tedious.
