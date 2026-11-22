# 🛠️ PuzzleTown — iOS Build & App Store Release Guide

This guide walks you through building, testing, archiving, and submitting PuzzleTown to Apple TestFlight and the App Store using Xcode and Capacitor.

---

## Prerequisites

1. **Apple Developer Account** (enrolled at [developer.apple.com](https://developer.apple.com)).
2. **Mac with macOS Sonoma / Sequoia** and **Xcode 16+**.
3. **Node.js 18+** & npm.

---

## Step 1: Prepare the Web Assets & Sync to iOS

On your project repository, run the build and sync command:

```powershell
# Build production web bundle and sync native iOS project
npm.cmd run cap:build
```

*(On macOS, run `npm run cap:build`)*

This compiles the TypeScript code, bundles optimized assets with Vite, and updates `ios/App/App/public` and native plugins (`@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app`).

---

## Step 2: Open Project in Xcode

Open the native workspace in Xcode:

```powershell
npm.cmd run cap:open:ios
```
*Or open `ios/App/App.xcworkspace` directly in Xcode.*

---

## Step 3: Configure Code Signing & Bundle Identifier

In Xcode:
1. Select the top-level **App** project in the left Project Navigator.
2. Under **Targets**, click **App**.
3. Go to the **Signing & Capabilities** tab.
4. Check **Automatically manage signing**.
5. Select your **Team** (your Apple Developer account).
6. Verify the **Bundle Identifier**: `com.puzzletown.game` (ensure this matches the App ID registered in your Apple Developer portal).

---

## Step 4: Verify Version & Build Numbers

Under the **General** tab:
* **Version** (`MARKETING_VERSION`): `1.0.0`
* **Build** (`CURRENT_PROJECT_VERSION`): `1` (increment by 1 for each new binary uploaded to App Store Connect, e.g. `1`, `2`, `3`).

---

## Step 5: Test on iOS Simulator / Physical Device

1. Select a target simulator (e.g., **iPhone 16 Pro Max**).
2. Press **Cmd + R** (or click the Play button) to build and run.
3. Test key interactions:
   * Board navigation and tile placement
   * Haptic feedback (on physical device)
   * Procedural audio playback and toggles in Settings
   * Multi-step Hint system
   * Level completion and star awards

---

## Step 6: Create an Archive for App Store / TestFlight

1. In the Xcode scheme selector at the top, select **Any iOS Device (arm64)**.
2. From the top menu bar, select **Product** > **Archive**.
3. Xcode will compile and package the release binary.
4. When archiving finishes, the **Organizer** window opens showing your archive.

---

## Step 7: Distribute & Upload to App Store Connect

1. In the Organizer window, select the archive and click **Distribute App**.
2. Select **App Store Connect** and click **Next**.
3. Select **Upload** (direct submission) and click **Next**.
4. Leave standard options selected:
   * *Strip Swift symbols*: Checked
   * *Upload your app's symbols*: Checked (for crash reports)
5. Select **Automatically manage signing**.
6. Review the summary and click **Upload**.
7. Once upload completes, you will see a green checkmark: *"Upload Successful"*.

---

## Step 8: Set Up TestFlight & Submit for Review

1. Go to [App Store Connect](https://appstoreconnect.apple.com/) > **My Apps** > **PuzzleTown**.
2. **TestFlight**:
   * Under the **TestFlight** tab, your uploaded build will process for ~5–15 minutes.
   * Add internal testers (instant access) or external testers (requires brief beta review).
3. **App Store Submission**:
   * Navigate to the **App Store** tab.
   * Paste in your metadata from [`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md).
   * Drag and drop the generated screenshots from [`release/ios/screenshots/`](./screenshots/).
   * Select your uploaded build.
   * Click **Save** and then **Add for Review**.
