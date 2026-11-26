# 🌐 HostGator Universal Links & App Links Setup Guide

To enable iOS Universal Links and Android App Links for `stonecallstudio.com/PuzzleTown/`, upload the files in this directory to your HostGator web hosting account.

---

## 📁 1. Where to Upload on HostGator

Log into HostGator **cPanel** &rarr; open **File Manager** &rarr; navigate to:
```
public_html/.well-known/
```
*(If the `.well-known` folder doesn't exist under `public_html/`, create it. Make sure "Show Hidden Files" is enabled in cPanel File Manager settings).*

Place these two files inside `public_html/.well-known/`:
1. `apple-app-site-association` (No file extension!)
2. `assetlinks.json`

---

## 🍎 2. iOS Configuration (`apple-app-site-association`)

Open `apple-app-site-association` and replace `<APPLE_TEAM_ID>` with your 10-character Apple Developer Team ID:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABC1234567.com.stonecallstudio.puzzletown",
        "paths": [
          "/PuzzleTown/*",
          "/PuzzleTown"
        ]
      }
    ]
  }
}
```

### Where to Find your Apple Team ID:
1. Log in to [developer.apple.com/account](https://developer.apple.com/account).
2. Go to **Membership details** (or view the top right corner under your name).
3. Copy your 10-character alphanumeric **Team ID**.

---

## 🤖 3. Android Configuration (`assetlinks.json`)

Open `assetlinks.json` and replace `<YOUR_ANDROID_SIGNING_KEY_SHA256>` with your Android App Signing key SHA-256 fingerprint:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.stonecallstudio.puzzletown",
      "sha256_cert_fingerprints": [
        "14:6D:E9:..."
      ]
    }
  }
]
```

### Where to Find your Android SHA-256 Fingerprint:
* **If using Google Play App Signing:**
  Log in to [Google Play Console](https://play.google.com/console) &rarr; Select PuzzleTown &rarr; **Setup** &rarr; **App Integrity** &rarr; Copy the **SHA-256 certificate fingerprint** under "App signing key certificate".
* **For local release keystore:**
  Run in terminal: `keytool -list -v -keystore your-release-key.jks` and copy the SHA256 line.

---

## 🔍 4. Verification Check

Once uploaded, you can verify they are publicly accessible by visiting in any browser:
* `https://stonecallstudio.com/.well-known/apple-app-site-association`
* `https://stonecallstudio.com/.well-known/assetlinks.json`

Both must load over HTTPS without certificate warnings.
