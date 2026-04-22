# GitHub File List Sorter

A Chrome extension that adds a sortable column header to GitHub's repository file lists, so you can order files by **Name**, **Last commit message**, or **Last commit date** with a single click.

Sorting by most-recently-changed makes it easier to see what's moved in a repo recently — useful for staying on top of updates to projects you follow or collaborate on.

## Features

- **Sortable column headers** on the repository file table — click **Name**, **Last commit message**, or **Last commit date** to sort; click again to flip direction.
- **Auto-sort on page load** — optional setting to apply a default sort every time you open a folder in a repo.
- **Folders stay pinned at the top**, and the `..` parent-directory link stays at the top of the list regardless of sort order.
- **File tree dates** — adds relative-time labels (`3d`, `2mo`, `1y`, …) next to items in the left-hand file tree, and orders each level newest-first.
- **Survives GitHub's soft navigation** — re-applies itself as you click around without full page reloads.

## Install as an unpacked extension

1. Clone or download this repository to a folder on your machine.
   ```
   git clone https://github.com/MultiTech-Visions/github-file-sorter.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this project (the one with `manifest.json`).
5. Visit any repository on `https://github.com/` — the file list header is now clickable.

The same steps work in other Chromium-based browsers (Edge, Brave, Arc, etc.) via their equivalent extensions page.

## Usage

### Manual sort

On any repo page with a file list, click a column header:

- **Name** — alphabetical (A → Z), click again for Z → A
- **Last commit message** — alphabetical by message
- **Last commit date** — chronological (defaults to newest-first)

An arrow (▲ / ▼) on the active column indicates the current direction.

### Auto-sort

Click the extension's toolbar icon to open the popup, then:

1. Toggle **Auto-sort on page load** on.
2. Pick a **Sort by** column and **Direction**.
3. Settings save automatically and sync via Chrome across signed-in devices.

Every time you load a repo folder after that, the file list is sorted for you.

## How it works

- `manifest.json` — Manifest V3 extension definition; registers the content script on `https://github.com/*` and a popup for settings.
- `content.js` — runs on GitHub pages. Locates the file table, ensures the `<thead>` is visible (GitHub hides it), attaches click handlers, and sorts `<tbody>` rows in place. Also annotates the left-hand file tree by fetching GitHub's `tree-commit-info` endpoint and ordering each level.
- `content.css` — styles the (often hidden) table header and sort-direction indicators, plus the relative-date labels in the file tree.
- `popup.html` / `popup.js` — the toolbar popup UI; persists auto-sort preferences via `chrome.storage.sync`.

## Permissions

- `storage` — to remember your auto-sort preference.
- Host access is limited to `https://github.com/*`.

No analytics, no remote code, no tracking.
