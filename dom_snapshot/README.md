# Bb DOM Snapshot Downloader

Captures the current page's live, rendered DOM and downloads it as a standalone `.html` file. Unlike "View Page Source," which only shows the original server response before JavaScript runs, this grabs the actual post-render markup — useful for filing detailed bug reports, archiving exact page state, or comparing a page's structure before and after a change.

---

## Features

- Captures `document.documentElement.outerHTML` — the full live DOM, including anything JavaScript added or changed after the initial page load.
- Excludes the bookmarklet's own floating panel from the snapshot, so the downloaded file reflects only the page itself.
- Shows a summary (approximate file size, element count) before you download, so you know what you're getting.
- **Re-capture** button — re-run the capture against the current DOM state without re-running the bookmarklet, useful after opening a menu or dialog you want included.
- **Download Snapshot** — saves a timestamped `.html` file named for the current host.
- Works on any page, not just Blackboard LMS pages — no page-specific requirements.

---

## Installation

1. Visit the [Blackboard Bookmarklets docs page](https://jkelley-blackboard.github.io/blackboard-bookmarklets).
2. Find **Bb DOM Snapshot Downloader** and click **Copy Bookmarklet**.
3. Create a new bookmark in your browser and paste the copied code as the URL.

---

## Usage

1. Navigate to the page you want to capture.
2. If you want to include something that only renders while open (a dropdown menu, a dialog, an expanded panel), open it first.
3. Click the **Bb DOM Snapshot Downloader** bookmarklet — a panel appears showing the host, URL, capture time, and an approximate size/element count.
4. Click **Re-capture** after changing page state, if needed.
5. Click **Download Snapshot** to save the `.html` file.

### Notes & Troubleshooting

- The downloaded file captures markup and structure, not appearance — it won't visually render exactly like the live page, since external stylesheets, fonts, and scripts referenced by `<link>`/`<script>` tags may not be reachable (or may have changed) when you open the file later.
- This is a static snapshot, not an interactive one — any JavaScript-driven behavior on the page (open menus, live data, event handlers) is captured as markup only and won't function in the downloaded file.
- Large single-page apps (like Blackboard Ultra) can produce a multi-megabyte file — this is expected given how much markup a modern SPA renders.
- Re-running the bookmarklet on the same page resets the panel; click **Re-capture** rather than re-clicking the bookmarklet if you just want a fresh capture.

---

## File Structure

```
dom_snapshot/
├── dom_snapshot_bookmarklet.js          # Annotated source (source of truth)
├── dom_snapshot_bookmarklet.min.bk.js   # Minified single-line bookmarklet
└── README.md
```

---

## Development / Implementation Notes

- **Self-exclusion**: the tool clones `document.documentElement` before serializing and removes the clone's copy of the tool's own panel (`#domSnapshotPanel`) so the snapshot doesn't include its own UI — the live panel in the actual page is untouched.
- **No page guard**: unlike most bookmarklets in this repo, this tool intentionally has no Blackboard-specific page guard — it's designed to work anywhere, since DOM capture is a generic utility, not a Blackboard-data extractor.
- **No pretty-printing**: the download is raw `outerHTML`, not reformatted/indented. A hand-rolled recursive indenter was considered (bookmarklets can't pull in an external formatter) but adds real code for a readability-only benefit; raw output was chosen to keep the tool small and the markup byte-exact.
- **File naming**: `dom-snapshot_<host>_<ISO-timestamp>.html`, consistent with the timestamped download naming used elsewhere in this repo (e.g. `css_selector_auditor`).

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
