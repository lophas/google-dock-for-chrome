# Privacy policy — Google Dock for Chrome

Last updated: October 21, 2026

Google Dock for Chrome is an independent browser extension maintained by the GitHub publisher lophas. Its purpose is to launch, switch between, and organize Google app tabs.

## Information handled on your device

The extension reads open-tab URLs and tab metadata, including tab identifiers, window and group membership, active state, order, and last-access information. It uses this information locally to recognize Google apps, reuse existing tabs, show running and active indicators, and arrange app tabs in the Google Dock group. It does not read Chrome's browsing-history database or maintain a browsing-history log.

The extension stores pinned apps, their order, appearance and activation preferences, and optional per-app account URLs in Chrome's local extension storage. An account URL can contain a Google account index or an email address in the authuser parameter. These values are used only to open or identify the account chosen by the user.

Temporary app-tab associations and dock state are kept in session storage or memory. The extension handles pointer and keyboard events to operate its interface; it does not record keystrokes, pointer movements, or an interaction history.

## Information not collected

The extension does not read the contents of emails, documents, photos, passwords, payment records, or other Google app content. Passwords and Payments icons are links to those services, not access to their data. It does not collect authentication credentials or cookies, financial information, health information, or location data.

## Sharing and network activity

The extension has no developer-operated backend, analytics, advertising, or telemetry. It does not transmit the tab information or stored preferences described above to the developer or third parties, and does not sell user data.

Opening an app navigates your browser to that Google service. That service processes the resulting visit under its own privacy policy. Visiting this GitHub repository or submitting a support issue is governed by GitHub's privacy practices. Information voluntarily posted in a public issue is public.

## Storage, retention, and deletion

Settings remain in local extension storage until changed or removed. Temporary session state is cleared when the browser session ends. Uninstalling the extension removes its extension storage. Closing a tab removes it from the current open-tab state.

The optional backup feature creates a local JSON file containing the pinned app selection and order. Backups are not uploaded by the extension. Users control where exported files are stored and can delete them themselves.

## Permissions

- storage: save preferences and temporary dock state.
- tabs: identify, reuse, switch, close, and arrange app tabs.
- tabGroups: create and manage the Google Dock tab group.
- Access to HTTP and HTTPS webpages: display the floating dock and edge activation area across ordinary webpages. Webpage content is not collected or transmitted.

All executable code is bundled with the extension; no remotely hosted code is downloaded or executed.

## Limited Use

Google Dock for Chrome's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Information is used only for the extension's stated, user-facing functionality, not for advertising, creditworthiness, lending, or unrelated purposes. The developer has no remote access to the locally handled data.

## Changes and contact

This policy will be updated if the extension's data handling changes. For questions, contact the maintainer through https://github.com/lophas/google-dock-for-chrome/issues. Do not include private account information in public issues.
