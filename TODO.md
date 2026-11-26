# PuzzleTown — Project TODO & Release Checklist

## 1. Universal Links & App Links (Share / Challenge Feature)
The code and native configurations for sharing challenges and handling deep links (`https://stonecallstudio.com/PuzzleTown/?level=X&challengeStars=Y`) are implemented in the repository. To activate direct app opening on production devices, complete these server/store steps:

- [ ] **Fill in Apple Team ID in [`public/.well-known/apple-app-site-association`](public/.well-known/apple-app-site-association)**
  - Replace `<APPLE_TEAM_ID>` with your 10-character Apple Developer Team ID (found at [developer.apple.com/account](https://developer.apple.com/account) &rarr; Membership Details).
- [ ] **Fill in Android SHA-256 Fingerprint in [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json)**
  - Replace `<YOUR_ANDROID_SIGNING_KEY_SHA256>` with your release signing certificate SHA-256 fingerprint (found in Google Play Console &rarr; Setup &rarr; App Integrity, or via `keytool -list -v`).
- [ ] **Upload `.well-known` Files to HostGator Root Domain**
  - In HostGator cPanel File Manager, navigate to `public_html/.well-known/` (at the root of `stonecallstudio.com`, not inside `/PuzzleTown/`).
  - Upload `apple-app-site-association` (ensure it has **no** `.json` or `.txt` file extension).
  - Upload `assetlinks.json`.
  - Verify both load over HTTPS in a browser:
    - `https://stonecallstudio.com/.well-known/apple-app-site-association`
    - `https://stonecallstudio.com/.well-known/assetlinks.json`
- [ ] **Verify Associated Domains Capability in Xcode**
  - When opening the iOS project in Xcode (`npm.cmd run cap:open:ios`), verify under **Signing & Capabilities** that the **Associated Domains** capability includes `applinks:stonecallstudio.com` (configured in [`ios/App/App/App.entitlements`](ios/App/App/App.entitlements)).

---

## 2. Other Release & Post-Launch Items
- [ ] **Deploy Latest Web Build to HostGator (`stonecallstudio.com/PuzzleTown/`)**
  - Ensure the web version hosted on HostGator has the latest `dist/` build so browser fallback links parse `?level=X&challengeStars=Y` and display the challenge banner.
- [ ] **Google Analytics (Optional / Future)**
  - Google Analytics is currently disabled (`analyticsEnabled = false` in [`src/utils/analytics.ts`](src/utils/analytics.ts)) to simplify App Store privacy disclosures. Re-enable in the future if analytics tracking is desired.

---

## 3. Completed Design Expansions
- [x] **New Building Type: Windmill (`windmill`)**
  - Rule: Every Windmill must be orthogonally adjacent to a Farm (one-way requirement so existing levels remain valid; does not require a House or Road of its own).
  - Animated Windmill graphic with continuously rotating 4-blade lattice sails, integrated into the deduction solver, multi-step hint walkthroughs, and Rules modal.
- [x] **Larger Grid Size (7×7) & Chapter 6 ("Windmill Ridge", Levels 101–125)**
  - Added 25 pre-baked, 100% logic-deducible levels in Chapter 6 (`5×5` intro, `6×6` mid-chapter, and `7×7` grand layouts) while preserving Levels 1–100 untouched.
  - Added `New 7×7 Shire` to the Endless Charter Generator.
