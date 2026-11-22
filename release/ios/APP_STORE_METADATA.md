# 🍎 PuzzleTown — App Store Connect Metadata Package

Complete, copy-paste ready metadata and store listing copy for Apple App Store Connect.

---

## 1. Core Listing Information

| Field | Value | Character Count | Limit |
| :--- | :--- | :--- | :--- |
| **App Name** | `PuzzleTown: Cozy Logic Village` | 30 chars | Max 30 |
| **Alternative App Name** | `PuzzleTown: Logic Village` | 24 chars | Max 30 |
| **Subtitle** | `Pure Deduction & Town Builder` | 29 chars | Max 30 |
| **Alternative Subtitle** | `Deduce, Plan & Build Villages` | 29 chars | Max 30 |
| **Bundle ID** | `com.stonecallstudio.puzzletown` | — | Unique reverse-DNS |
| **SKU** | `PUZZLETOWN_IOS_001` | — | Internal SKU |
| **Primary Category** | `Games` > `Puzzle` | — | Required |
| **Secondary Category** | `Games` > `Board` (or `Strategy`) | — | Optional |
| **Age Rating** | `4+` (No violence, no objectionable content) | — | Apple Questionnaire |
| **Copyright** | `© 2026 PuzzleTown` | — | Max 255 |

---

## 2. Keywords (App Store Search Optimization)

> [!IMPORTANT]
> Apple allows a maximum of 100 characters. Separate keywords with single commas and **omit spaces** to maximize keyword capacity. Do not repeat words already in the App Name or Subtitle.

```text
grid,brain,nonogram,cozy,strategy,offline,town,calm,daily,relax,tents,trees,minesweeper,picross,wood
```
*(Total: 96 / 100 characters)*

### Keyword Strategy Breakdown:
* **Genre Anchors**: `grid`, `nonogram`, `picross`, `minesweeper`
* **Vibe / Aesthetic**: `cozy`, `calm`, `relax`
* **Mechanics**: `strategy`, `brain`, `tents`, `trees`
* **Feature Hooks**: `offline`, `daily`

---

## 3. Promotional Text (170 characters max)

> [!NOTE]
> Promotional text appears at the top of your product page above the description and can be edited at any time without submitting a new app build.

```text
Build a thriving medieval village tile by tile! Use pure logic deduction to solve 100+ handcrafted puzzles with zero guessing. Cozy, relaxing, and fully playable offline.
```
*(Total: 170 / 170 characters)*

---

## 4. Full App Store Description

```text
Welcome to PuzzleTown, where peaceful village building meets pure logic deduction.

If you love the thoughtful satisfaction of Nonograms, Sudoku, Picross, or Tents & Trees, PuzzleTown brings a fresh, charming twist to grid deduction: every single level is 100% solvable through pure deduction with zero guessing required.

■ BUILD A LIVING MEDIEVAL HAMLET
Your village expands tile by tile according to strict neighborhood rules:
• Woodcutters must be placed adjacent to natural Trees to harvest timber.
• Houses need to be near Woodcutters or fertile Farms to thrive.
• Farms produce food to sustain nearby Houses.
• Town Halls require a peaceful perimeter clear of other buildings.
• Paved Roads weave through the countryside to connect every structure to the Town Hall.

■ LINE TOTAL CLUES — SHARP & SATISFYING
Numbers along the board edges indicate the exact number of buildings in each row and column. Use process of elimination, rule out impossible positions, and watch the countryside burst with green grass as lines reach their target!

■ ZERO GUESSING — PURE LOGICAL CERTAINTY
Every puzzle has exactly one unique solution reached through clear logic:
• Logical Candidate Rule-Out: Mark cells that can never hold a building.
• Multi-Step Hint Walkthrough: Stuck on a tricky board? The intelligent hint engine doesn't just give you the answer—it walks you through the exact deduction, showing which candidates can be eliminated and why.

■ COZY, TACTILE & RELAXING
• 100+ Handcrafted Levels: Progress through 5 idyllic chapters, from the gentle "Peaceful Hamlet" to the sprawling "Grand Capital".
• Procedural Acoustic Music: A tranquil, procedurally arranged medieval countryside soundtrack featuring Celtic harp, wooden flute, pizzicato strings, and sparkling bells.
• Tactile Haptics: Responsive feedback for every road placed, timber cut, and line cleared.
• Charming Living Details: Watch sheep wander across marked meadows, bunnies peek from behind trees, and butterflies flutter from wildflower to wildflower.
• 100% Offline Play: No Wi-Fi or data connection required. Play anywhere—on commutes, flights, or cozy evenings at home.
• Respectful Design: No intrusive banners, no paywalls, and no timers rushing your thought process. Solve at your own peaceful pace.

Put on your builder's hat, grab your tools, and discover the most relaxing puzzle village on iOS!
```

---

## 5. What's New in Version 1.0.0 (Release Notes)

```text
Welcome to the official launch of PuzzleTown on iOS!

• 100+ Handcrafted Logic Levels: Explore 5 chapters with increasing board sizes and strategic challenges.
• Pure Logical Deduction: Every board is mathematically guaranteed to be solvable with zero guessing.
• Interactive Step-by-Step Hint Engine: Learn advanced deduction techniques with guided walkthroughs.
• Procedural Countryside Soundscape: Relax with soothing acoustic folk melodies in 6/8 meter.
• Native iOS Experience: Supports iPhone Taptic Engine haptics and edge-to-edge Super Retina displays.
• Play Offline: Build your peaceful village anywhere, anytime.
```

---

## 6. App Review Information & Questionnaire

### App Review Notes:
```text
PuzzleTown is a single-player offline logic puzzle game. 
- No user login or registration is required.
- All game features are accessible immediately.
- There are no third-party ads or tracking frameworks.
- Audio and haptics can be toggled in the in-game Settings modal (accessible via the gear icon in the top header).
```

### Age Rating Questionnaire Answers:
* **Violence / Profanity / Crude Humor**: None
* **Alcohol, Tobacco, or Drug References**: None
* **Gambling / Contests**: None
* **Horror / Fear Themes**: None
* **Medical / Treatment References**: None
* **Unrestricted Web Access**: No
* **Gambling & Contests**: No
* **Result**: **Rating 4+ (All Ages)**

### App Privacy Nutrition Label:
* **Data Collection**: Select **"Data Not Collected"** (PuzzleTown runs completely locally on device; progress is saved in local storage without transmitting personal data).

---

## 7. Required URLs (Hosted at Root of Web Game)

* **Support URL**: `https://tincholas.github.io/PuzzleTown/support.html` (built automatically from `public/support.html`)
* **Marketing URL**: `https://tincholas.github.io/PuzzleTown/`
* **Privacy Policy URL**: `https://tincholas.github.io/PuzzleTown/privacy.html` (built automatically from `public/privacy.html`)
