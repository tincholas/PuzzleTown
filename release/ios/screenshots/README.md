# 📸 App Store Screenshots Guide

Apple App Store guidelines favor authentic, real gameplay screenshots. Taking screenshots directly from the Xcode Simulator produces pixel-perfect, uncompressed PNG files at the exact required App Store resolution.

---

## 1. Required Screenshot Dimensions

* **iPhone 6.9" / 6.7" Super Retina Display** (iPhone 16 Pro Max / 15 Pro Max):
  * **Resolution**: `1290 x 2796` pixels (portrait) or `1320 x 2868` pixels.
  * *Note: App Store Connect automatically scales this primary set for other modern iPhones.*

---

## 2. How to Capture in 3 Easy Steps (Xcode Simulator)

1. **Launch the Simulator**:
   * Open the project in Xcode: `npm run cap:open:ios`
   * Select **iPhone 16 Pro Max** (or **iPhone 15 Pro Max**) in the top device menu.
   * Press **Cmd + R** to run.
2. **Navigate to Desired Game Screens**:
   * Play or navigate to each of the 5 recommended screens listed below.
3. **Capture Instant Native Screenshot**:
   * Press **Cmd + S** (or click **File** > **Save Screen**).
   * Xcode saves a pixel-perfect `1290 x 2796` PNG file directly to your Mac Desktop.
   * Drag and drop the captured PNGs into this folder or directly into App Store Connect!

---

## 3. Recommended 5 Screenshots for High Conversion

1. **Screenshot 1 — Core Gameplay Board**:
   * An active mid-game puzzle (e.g. Chapter 1 or 2) with a mix of placed Woodcutters, Houses, Farms, Roads, and some marked grass/crosses, showing the wooden building tray and row/column clue badges.
2. **Screenshot 2 — Neighborhood Building Rules**:
   * The **Rules Modal** open, showcasing the cozy illustrated cards (Woodcutters harvesting Trees, Farms feeding Houses, Roads connecting to Town Hall).
3. **Screenshot 3 — Step-by-Step Hint Walkthrough**:
   * The **Interactive Hint Engine** active on a board, showing highlighted candidate cells and the multi-step deduction dialogue.
4. **Screenshot 4 — Campaign Level Select**:
   * The **Level Select Modal** showing solved levels with gold 3-star ratings across chapters.
5. **Screenshot 5 — Victory Celebration**:
   * The celebratory **Village Complete!** modal with gold stars and confetti.
