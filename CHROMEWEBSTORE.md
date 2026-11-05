# Chrome Web Store Listing — Google Dock for Chrome

> Last Updated: 2026-11-05

Everything entered in the Chrome Web Store Developer Dashboard for this item, in one
place. Keep it in step with `manifest.json`, `PRIVACY.md` and
`docs/webstore-description.txt`. The release ZIPs never include this file (the release
workflow copies a fixed list of files).

- **Item ID:** mdfkbmofiglnboilbcbhnmdhmfpkejja (not published; rejected twice)
- **Upload:** `google-dock-for-chrome-X.Y.Z-webstore.zip` from the GitHub release.

## Before the next submission

The item was rejected twice (see Rejection History). Resubmitting the same listing again
risks the developer account, which also carries Arc Side of the Chrome. Settle these first:

- [ ] **Name.** "Google" in the extension name is a trademark the store's review
      checklist says not to use without authorization; the icon and screenshots show
      Google app logos too. Choose a name that does not start with another company's
      brand, for example "App Dock for Google apps" or a name of its own, and keep "not
      affiliated with Google" in the description.
- [ ] **Single purpose.** The second rejection quotes the rule against extensions whose
      single purpose is launching webpages. Describe the extension as organizing and
      switching between the user's open app tabs (reuse of an open tab, running and
      active indicators, a dedicated tab group, per-app accounts), not as a link
      launcher.
- [ ] **Duplicate items.** "Repetitive Content" is also quoted: check that the
      dashboard holds only one Google Dock item (delete drafts of earlier attempts).
- [ ] **Screenshots.** The current images are 1280×900 and 860×1000; the store accepts
      only 1280×800 or 640×400. Re-capture at 1280×800.
- [ ] **Appeal or resubmit.** If nothing above applies, appeal the second rejection from
      Build › Status instead of resubmitting unchanged.

## Store Listing

**Extension Name**
Google Dock for Chrome — see "Before the next submission".

**Short Description** (manifest `description`, 50 of 132 characters)
A floating, auto-hiding dock for your Google apps.

**Detailed Description** (`docs/webstore-description.txt`, second submission)

```text
Keep your Google apps within easy reach with a customizable dock and toolbar launcher.

Open an app or switch to its existing tab. Pin your favorites, drag icons into your preferred order, and see which apps are open or active. App tabs stay together in a dedicated tab group.

Choose a top or bottom dock with optional auto-hide, or use the toolbar launcher on its own. Search the app menu to find additional services and pin only the ones you use.

Customize icon size, theme, transparency, and the activation area. Remember a preferred signed-in account for individual apps, and back up or restore your pinned app selection.

Tab URLs and optional account URLs are processed locally to recognize apps and select the correct account. The extension has no analytics or developer-operated backend.

Quick start:
1. Pin the extension to your Chrome toolbar.
2. Open a webpage and move your pointer to the selected screen edge.
3. Right-click an app and choose Keep in Dock.
4. Open Settings for appearance, account, and backup options.

Use the toolbar launcher on pages where Chrome does not allow the floating dock, including browser settings and the Chrome Web Store.

Independent project, not affiliated with or endorsed by Google.
```

Never list the individual app names in the description: the first submission did and was
rejected as keyword spam.

**Category**
To confirm in the dashboard (Workflow & Planning fits best).

**Single Purpose** (proposed for the next submission)
Organize and switch between the user's Google app tabs from a dock, reusing an already open tab and keeping app tabs together in one tab group.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 required | 🟡 1280×900, re-capture | `docs/screenshots/dock-bottom.png` |
| Screenshot 2 | 1280×800 required | 🟡 1280×900, re-capture | `docs/screenshots/dock-top.png` |
| Screenshot 3 | 1280×800 required | 🟡 1280×900, re-capture | `docs/screenshots/app-menu.png` |
| Screenshot 4 | 1280×800 required | 🟡 860×1000, re-capture | `docs/screenshots/settings.png` |
| Small Promo Tile | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

`scripts/screenshots.cjs` makes the screenshots; it needs a 1280×800 store mode.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Save the pinned apps, their order, appearance and activation preferences, optional per-app account choices and temporary dock state. |
| tabs | permissions | Recognize which app is open in which tab, so clicking an app returns to its existing tab instead of opening a duplicate, shows running and active indicators, and can close or arrange app tabs. |
| tabGroups | permissions | Create and manage the dedicated tab group that keeps app tabs together. |
| `http://*/*`, `https://*/*` (content script) | host_permissions | Display the floating dock and its screen-edge activation area on ordinary webpages the user visits. The page content is not read, collected or transmitted. |

**Remote code:** No, I am not using remote code. All code, including the dock styles, is bundled.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes — handled locally only.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes (optional) | No | A per-app account URL can contain an email address chosen by the user | No |
| Health info | No | — | — | — |
| Financial info | No | — | — | — |
| Authentication info | No | — | — | — |
| Personal communications | No | — | — | — |
| Location | No | — | — | — |
| Web history | Yes | No | Open-tab URLs to recognize app tabs | No |
| User activity | No | — | Pointer and key events only operate the dock; nothing is recorded | — |
| Website content | No | — | — | — |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
https://github.com/lophas/google-dock-for-chrome/blob/main/PRIVACY.md

`PRIVACY.md` mentions "Passwords and Payments icons"; update it with the name and app list
if those change.

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**: Jata (non-trader)
**Contact Email**: lophas@yahoo.com (publisher account: jatahu@gmail.com)
**Support URL**: https://github.com/lophas/google-dock-for-chrome/issues
**Homepage URL**: https://github.com/lophas/google-dock-for-chrome

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.3.x | 2026-10-23 | Description listing every app name | Rejected 2026-10-23 |
| 1.3.2 | 2026-10-24 | Description from `docs/webstore-description.txt` | Rejected 2026-10-24 |

## Review Notes

### Known Issues / Limitations
- Chrome does not allow the floating dock on its own pages or in the Web Store; the toolbar launcher works there.
- Some services need an eligible Google account or subscription.

### Rejection History

| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| 2026-10-23 | Keyword Spam ("Yellow Argon"): the description listed Gmail, Calendar, Drive and 15 more app names | New description without the app list | 2026-10-24 |
| 2026-10-24 | Spam and Placement in the Store ("Yellow Nickel"), automated: the notice quotes repetitive content, keyword spam, ranking manipulation, launcher-only functionality, notification and message spam without naming which | Open: see "Before the next submission" | No |

The second notice warns that repeated violations can suspend the developer account.
