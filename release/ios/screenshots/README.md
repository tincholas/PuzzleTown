# 📸 App Store Screenshots (Authentic In-Game Captures)

All 5 screenshots in this directory are captured directly from the **actual, live PuzzleTown game** running at iPhone 16 Pro Max Retina resolution (**`1290 x 2796`** pixels).

---

## 1. Screenshots Overview

* **`screenshot-1-gameplay.png`**: Authentic in-progress board with placed Woodcutters, Houses, Trees, and row/column clue badges.
* **`screenshot-2-rules.png`**: The live, illustrated Neighborhood Building Rules modal.
* **`screenshot-3-hints.png`**: The live Interactive Step-by-Step Hint Engine in action on a board.
* **`screenshot-4-levels.png`**: The Campaign Level Selection screen with 3-star ratings across chapters.
* **`screenshot-5-victory.png`**: The celebratory "Village Complete!" victory modal with 3 gold stars and confetti.

---

## 2. Regenerating Real Screenshots Anytime

To re-capture all 5 authentic screenshots automatically:

```powershell
npm.cmd run screenshots
```

*(On macOS: `npm run screenshots`)*

This starts a local instance of the built game in headless Chrome and captures pixel-perfect `1290 x 2796` PNG files directly into this directory.

---

## 3. Alternative: Manual Capture in Xcode Simulator

You can also take screenshots manually at any time:
1. Open the project in Xcode: `npm run cap:open:ios`
2. Select **iPhone 16 Pro Max** (or **iPhone 15 Pro Max**) in the device bar and press **Cmd + R**.
3. Press **Cmd + S** (File > Save Screen). Xcode saves an uncompressed `1290 x 2796` PNG straight to your Mac desktop.
