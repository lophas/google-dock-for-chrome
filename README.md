# Google Dock for Chrome

A macOS-inspired, auto-hiding dock for Google apps, built as a dependency-free Chrome Manifest V3 extension.

## Install for testing

1. Download this repository using **Code → Download ZIP**, then extract it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Refresh an existing website tab. Move the mouse to the bottom **center** of the page and pause briefly to reveal the dock.

## Version 0.5.0

- Floating glass dock with hover magnification and a delayed hide.
- Drag pinned icons directly in the dock to reorder them. A blue insertion marker shows the destination; order is saved across tabs.
- The Gemini SVG uses self-contained colored paths so repeated copies in the launcher and dock cannot lose their gradient reference.
- A configurable 4/16/24/32 px bottom trigger (24 px by default), 100 ms dwell and 380 ms hide delay; a generous corridor between the bottom edge and dock prevents flicker.
- Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, Chat, Keep, Photos, Maps, YouTube and Gemini.
- Shortcuts for Google Payments, Password Manager, Google Account, Contacts and Google One; they support pinning, tab reuse and grouping just like the apps.
- A normal click reuses the app’s remembered tab, then falls back to an existing matching app tab (current window preferred), and opens a tab only when needed. App tab IDs are kept in session storage across service-worker restarts. Rapid same-app clicks are serialized to prevent duplicates. If the remembered tab closes or navigates away from the app, the next click finds or creates a replacement. The tab is not Chrome-pinned, so it can stay in the Google Dock tab group.
- Ctrl/Cmd/Shift-click forces a new tab. Middle-click opens a background tab.
- Right-click any dock or launcher icon for **Keep in Dock** and **Close** when the app has a running tab, otherwise **Open**. Close removes one app tab: the active matching tab in this window, then the remembered app tab, then another matching tab. It does not unpin the app or close all duplicate tabs. Unpinned running apps appear to the right of a separator and disappear after their last tab closes (browser tab events push updates from the shared state).
- Apps opened or activated through the dock or toolbar launcher join a blue **Google Dock** native Chrome tab group in their own window. Concurrent launches reuse the same group. Chrome-pinned tabs remain pinned and display a grouping warning.
- The active app in the dock’s browser window has a blue background and a wider blue indicator; ordinary running apps retain a dot. Tab activation and navigation push an update to the active page. Non-Google active tabs clear the active-app marker.
- Native Google Dock group tabs follow pinned-icon order, then temporary-app catalogue order. Dock reordering/pinning synchronizes every window; app launches, navigation and manual group-tab moves also trigger sorting. Multiple tabs of the same app retain their relative order, while unrelated tabs manually added to the group stay at the end. The sorter preserves the group’s position among other tabs.
- One service-worker dock model owns settings, running apps, active apps by window and UI state. All page views consume this snapshot. Browser events refresh it and push changes; page scripts do not poll or scan tabs. Window-level dock visibility, launcher openness and search text survive tab switches. The model is stored in session storage across service-worker suspension; app settings remain in local storage across browser restarts. A separate DOM view is still required in each webpage, because an extension cannot share one DOM node across page documents.
- Generated extension thumbnail and packaged 16/32/48/128 px icons are connected to the manifest and toolbar action.
- Searchable all-app launcher, also available from the toolbar on restricted pages.
- Settings: pinned apps, drag-and-drop and keyboard-button reordering, three icon sizes, light/dark/system theme, activation-zone height, autohide, tab reuse and enable switch.
- **Alt+Shift+G** toggles the dock; customize via `chrome://extensions/shortcuts`. **Escape** closes it. The dock stays hidden during webpage fullscreen.
- Local settings and packaged SVG icons. No analytics, network icon requests, build step or runtime dependencies.

## Scope

The dock is an overlay inside normal HTTP/HTTPS webpages. Chrome internal pages, the Chrome Web Store and Chrome's built-in PDF viewer prohibit content scripts; use the toolbar launcher on those pages. The extension does not replace Chrome's New Tab page. On touch devices use the toolbar launcher. Refresh existing tabs after installation or extension reload.

App URLs currently use the default Google account (`u/0` where supported). Tab reuse matches the app, regardless of account; disable reuse or force a new tab if you want the default-account URL. Account selection, unread badges and service-specific shortcuts are future work.

## Permissions and privacy

The `storage`, `tabGroups` and `tabs` API permissions are requested. `tabGroups` names and manages the native Google Dock group. `tabs` explicitly enables reading app tab URLs and pending URLs for reliable reuse and running indicators, independently of content-script injection permissions. Content scripts run on HTTP/HTTPS websites to provide the dock. No cookies, mailbox or calendar-content APIs are used. Settings are stored in `chrome.storage.local`, without cloud sync. App-to-tab IDs, the shared dock model and per-window presentation state live in `chrome.storage.session` and clear when the browser session ends. URLs are used in memory for app matching and are not persisted or transmitted. Google sites receive normal navigation requests when opened.


## Development

Load the source folder directly in Chrome. Run the behavior tests with Node 18+:

```sh
node --test tests/*.test.cjs
```

Automated tests cover tab reuse and creation, rapid same-app launches, remembered tabs and sign-in redirects, pending URL detection, dock drag-and-drop persistence and click suppression, shortcut matching, app matching, settings validation, concurrent pin changes and group creation, per-window grouping, grouping-failure handling, temporary running apps, right-click pinning, configurable trigger height, repeated edge reveal, dwell cancellation, the grace corridor, Escape, disabling and fullscreen suppression. Content-script tests use a DOM fixture; visual layout and actual Chrome API integration still need the manual checks below.

Manual acceptance checks: reveal at the bottom center; move into the dock and down through its gap; leave and verify delayed hiding; search apps and right-click to pin/unpin; close all tabs of a temporary app and verify removal; check group creation/reuse in multiple windows; test existing-tab focus, forced new tabs and middle clicks; change settings and reorder apps; verify active-app highlighting while switching apps and visiting non-Google sites; verify group tab order after dragging dock icons and manually dragging tabs; verify narrow viewports, dark mode, keyboard focus, Escape and fullscreen.

Google Dock for Chrome is an independent project and is not affiliated with Google. The existing repository GPL-3.0 license applies; see [LICENSE](LICENSE).

## Updating from an earlier version

Replace the unpacked extension folder, reload it in `chrome://extensions`, and refresh website tabs. Existing settings are preserved; activation-zone height defaults to 24 px. Version 0.2 added `tabGroups`; version 0.3 adds `tabs` for reliable app-tab detection. Keep **Switch to an existing app tab when available** enabled for persistent reuse.

## Restricted browser pages

A webpage overlay cannot be placed on `chrome://settings`, `chrome://extensions` or Chrome-generated network error pages. These surfaces prohibit extension content scripts, regardless of the autohide setting. Use the toolbar launcher or **Alt+Shift+G** fallback there. Ordinary HTTP/HTTPS pages that display a website-generated error remain normal webpages and use the configured dock behavior.

## Icon asset

The thumbnail was generated with the built-in ImageGen tool, then resized for Chrome packaging. The original prompt is in [icons/prompt.txt](icons/prompt.txt); the full thumbnail is [icons/thumbnail.png](icons/thumbnail.png).
