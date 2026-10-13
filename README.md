<p align="center"><img src="icons/icon-128.png" width="80" height="80" alt="Google Dock icon"></p>

# Google Dock for Chrome

Your Google apps in a floating, macOS-style dock. Reveal it at the bottom of a webpage, switch between apps and keep your favorites close at hand.

## Install

1. Download the **release ZIP** from the [latest release](https://github.com/lophas/google-dock-for-chrome/releases/latest) and extract it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Refresh your open website tabs. Pin the extension to Chrome’s toolbar for quick access to the app menu.

## Use the dock

Move the pointer to the **bottom center** of a webpage (or **top center** when the top edge is selected) and pause briefly to reveal the dock. It hides when you move away.

| Action | What it does |
| --- | --- |
| Click an app | Switch to its existing tab, or open it if needed |
| Ctrl/Cmd/Shift-click | Open a new tab |
| Middle-click | Open a new background tab |
| Right-click → **Keep in Dock** | Pin or unpin the app |
| Right-click → **Open / Close** | Open the app or close one of its tabs |
| Drag a pinned icon | Change the dock order |
| Click the grid button | Search all apps and add favorites |
| **Alt+Shift+G** | Show or hide the dock |
| **Escape** | Dismiss the context menu or dock |

A dot marks a running app in both the dock and app menu; a blue highlight marks the active app. Unpinned running apps appear to the right of the favorites and disappear when their last tab closes.

App tabs are collected in a **Google Dock** Chrome tab group, in the same order as the dock icons. The dock and app menu share their state across tabs. Opening an app closes the app menu.

## Available apps

Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, Chat, Keep, Photos, Maps, YouTube and Gemini, plus shortcuts to Payments, Password Manager, Google Account, Contacts and Google One.

## Customize

Open **Settings** from the app menu or toolbar launcher to choose favorites, icon size, theme, dock background transparency, autohide and tab reuse.

Choose **Dock edge → Top / Bottom** in Settings. The dock and app menu follow the selected edge; bottom remains the default.

**Using the macOS Dock?** Increase **Activation zone height** to reveal Google Dock before reaching the screen’s bottom edge. The default is **24 px**.

**Dock background transparency** controls the background tint: **0%** is opaque and **100%** is transparent. A subtle **4 px blur** remains at every setting; app icons stay fully visible.

Change the keyboard shortcut at `chrome://extensions/shortcuts`.

## Use a different Google account

You can remember a separate signed-in account for each app, for example a different account for Photos.

1. Open the app and select the account you want to use.
2. Return to Settings → **Google accounts per app** and choose the app.
3. Click **Remember last-used app account**.

The dock opens and reuses tabs for that account. If its tab is in another window, the dock brings it into your current window. **Use automatic account** clears the saved choice.

Both accounts must be signed in within the **same Chrome profile**. If your sign-in order changes, remember the account again. An app can be remembered only when its URL identifies the account.

## Backup & restore

In Settings → **Backup & restore**:

- **Download backup** saves your pinned apps and their order as a JSON file.
- **Restore from file** replaces the pinned list with a saved backup.

Your theme, transparency and app-account choices are kept as they are; they are not included in the pinned-app backup.

## Good to know

- On Chrome settings, browser error pages, the Chrome Web Store and the built-in PDF viewer, use the **toolbar launcher** instead of the webpage dock.
- The dock stays hidden during webpage fullscreen.
- To update, replace the extension files, click **Reload** at `chrome://extensions`, then refresh website tabs. Your settings are preserved.

Settings stay on your device. No analytics; no access to mailbox, calendar or password contents.

Independent project, not affiliated with Google. Licensed under [GPL-3.0](LICENSE).
