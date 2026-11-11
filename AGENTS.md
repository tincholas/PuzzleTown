# PuzzleTown Agent Guidelines & Project Rules

This document outlines core game rules, domain terminology, and architecture principles for PuzzleTown. All AI agents working on this codebase must adhere strictly to these rules.

---

## 1. Domain Terminology: Buildings vs. Roads vs. Empty / Grass

### Tile Hierarchy
* **Buildings (`BuildingType`)**: `woodcutter`, `house`, `farm`, `town_hall`.
* **Roads (`road`)**: A transport network tile used to connect village buildings to the Town Hall. **Roads are NOT buildings.**
* **Fixed Obstacles**: `tree`, `rock` (immutable board terrain).
* **Open Sand**: Unplaced board cells (`empty` without grass mark).
* **Grass / Marked Clear**: Cells marked by the player with the "Empty" tool or automatically filled by tapping a `0` clue badge.

### Line Clues (Row & Column Indicators)
* **The numbers along the board edges count BUILDINGS ONLY.**
* They **do not** count Roads, Trees, or Rocks.
* A clue of `0` means **0 buildings** in that row or column.

### CRITICAL RULE: Grass / Empty Does Not Preclude Roads!
* **Marking a cell as empty, clear, or green grass means it DOES NOT contain a building.**
* **Marking a cell with grass DOES NOT mean it cannot have a road!**
* When a player or hint marks a row/column of `0` with green grass, it signifies that no buildings can be placed there. **Roads are still fully allowed to pass through green grass cells** if needed to connect the village network.
* Do not confuse "empty of buildings" with "cannot hold a road". In code and hints:
  * Eliminating all building types from a cell does NOT eliminate `road`.
  * Marking a cell green / clear represents "no building allowed here".

---

## 2. Hint System Design & Multi-Step Walkthroughs

Hints in PuzzleTown must be clear, readable, and educational. Dense, run-on hints with multiple nested coordinate references must be broken into interactive multi-step walkthroughs (`HintStep[]`):

1. **Step 1: Premise & Candidate Set**
   * Sets up the objective (e.g., *"Tree needs a Woodcutter"* or *"The Woodcutter at (2, 4) needs a Road connection"*).
   * Focuses on the relevant source tile (`focusCells`).
   * Highlights candidate open cells with pulsing candidate outlines (`candidateCells`).

2. **Step 2..N: Discarding Alternatives**
   * Explains why specific candidate cells were eliminated.
   * Highlights the discarded cell with a red ✕ marker (`discardedCells`).
   * **Explicit Reasoning**: When a cell is disqualified because an adjacent partner would violate a line limit, explicitly state that (e.g. `adjacent House would also be in Row 1, exceeding Row 1's limit of 1 building`). Never reduce quota violations to a vague *"no partner"* if an open cell is physically adjacent.

3. **Final Step: Conclusion & Placement**
   * Concludes that only the target cell remains valid.
   * Highlights the target cell with green pulse (`targetCell`).
   * Enables the **Apply** button to execute the move.

### Line Action Hints
* When a row or column reaches `0` remaining buildings needed, the clue badge turns green.
* The hint engine prioritizes prompting the player to tap the line clue badge (`lineAction: { axis, index }`), tapping which ripples green grass across all remaining open spots in that line.

---

## 3. Solver & Deduction Engine (`src/engine/solver.ts`)

* The solver operates strictly through logical deduction without guessing or backtracking.
* **Building Pruning**: Eliminates building candidates based on adjacency requirements (Woodcutter needs Tree; House needs Woodcutter/Farm; Farm needs House; Town Hall requires clear 8-perimeter).
* **Quota Constraints**: If a line has a limit of $K$ buildings, placing two partner buildings (e.g., Farm + House) in that same line requires $K \ge 2$. If $K < 2$, any placement forcing both into the line is disqualified.
* **Road Deductions**:
  * Dead-end roads (fewer than 2 connection exits) are pruned.
  * Essential road corridors and distance quotas to the Town Hall are resolved.
  * Remember: Roads can freely traverse cells marked as grass (non-building).

---

## 4. Development & Testing Commands (Windows PowerShell)

* **Run Tests**: `npm.cmd test` (Vitest)
* **Run Build**: `npm.cmd run build` (TypeScript check `tsc -b` and Vite bundle)
* Always use `.cmd` extensions on Windows (e.g. `npm.cmd`, `npx.cmd`).
