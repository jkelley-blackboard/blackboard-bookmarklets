# Bb Course Roster

Generates a full, print-ready course roster overlay for any Blackboard LMS Ultra course. Pulls all enrolled users via the REST API, enriches with friendly course role names, and renders a native-styled table with avatar, name, pronouns, pronunciation, and access data — with options to print or download as CSV.

---

## Features

- Fetches all enrolled users via the Blackboard LMS REST API (no page limit).
- Displays per-user:
  - Avatar
  - Full Name
  - Username
  - Email
  - Student ID
  - Other Name (with ✨ icon if preferred, ➕ if both names shown)
  - Pronouns
  - Pronunciation (text + 🔊 icon if audio exists)
  - Role (mapped to friendly `nameForCourses` label)
  - Availability
  - Enrollment Date
  - Last Login
  - Last Accessed
- Native Ultra look and feel — uses Blackboard LMS's own MUI CSS classes (`MuiTable-root`, `MuiTableCell-root`, `MuiAvatar-root`, etc.) so the table inherits the page's live theme, including institution color overrides via `--bb-theme-primary-color`.
- Branded header bar with sticky column headers and row hover highlights.
- Avatar and Name columns are sticky — they remain visible when scrolling right through the full column set.
- Long text cells (Name, Username, Email) truncate with ellipsis; hover the cell to see the full value.
- Date fields (Enrollment Date, Last Login, Last Accessed) use `yyyymmdd-hh:mm` format so sorting alphabetically in Excel produces chronological order.
- Overlay buttons: Print (`🖨`), Close (`✖`), Download CSV (`⬇`).
- Print view opens a dedicated browser window with a **Table** view (full data columns, including avatars) or a **Cards** view (photo-forward grid with name, role, pronouns, and email) — toggle between them before printing or saving as PDF.
- CSV export includes all columns except Avatar; UTF-8 BOM ensures correct encoding in Excel.
- Collapses to full-screen on narrow viewports (≤ 768px).
- All API fetches run concurrently for fast load on large courses.

---

## Installation

1. Visit the [Blackboard Bookmarklets docs page](https://jkelley-blackboard.github.io/blackboard-bookmarklets).
2. Find **Bb Course Roster** and click **Copy Bookmarklet**.
3. Create a new bookmark in your browser and paste the copied code as the URL.

---

## Usage

1. Navigate to any Blackboard LMS Ultra course page (URL contains `/ultra/courses/`).
2. Click the **Bb Course Roster** bookmarklet.
3. A full-screen overlay will appear with the complete roster table.
4. Use **Print** to open a printer-friendly roster window (toggle **Table** or **Cards** view there before printing), **Close** to dismiss, or **Download CSV** to save as `{courseId}_roster.csv`.

### Notes & Troubleshooting

- The bookmarklet must be run from within a course — it reads the course ID from the URL.
- Only reads data; it does not modify any Blackboard LMS records.
- For large courses, allow a few seconds for all API calls to complete.
- If the overlay appears unstyled, the page may not have fully loaded its MUI stylesheet — refresh and try again.

---

## File Structure

```
ultra_roster/
├── ultra_roster_bookmarklet.js         # Annotated source (source of truth)
├── ultra_roster_bookmarklet.min.bk.js  # Minified single-line bookmarklet
└── README.md
```

---

## Development / Implementation Notes

- **Async IIFE**: Uses `(async function () { 'use strict'; })()` instead of the standard sync IIFE because the bookmarklet makes multiple `await fetch()` calls.
- **Concurrent fetches**: All three API calls (`/courses/{id}`, `/courseRoles`, `/courses/{id}/users`) are issued in parallel via `Promise.all()`. Enrollment date is read from `item.created` on the enrollment record — no additional fetch required.
- **HTML sanitization**: All API-sourced values are passed through `esc()` before insertion into `innerHTML` to prevent XSS.
- **Native MUI styling**: Rather than duplicating Blackboard LMS's CSS, the overlay uses stable MUI class names (`MuiTable-root`, `MuiTableHead-root`, `MuiTableBody-root`, `MuiTableRow-root`, `MuiTableCell-root MuiTableCell-head/body MuiTableCell-sizeMedium`, `MuiAvatar-root MuiAvatar-circular`) that are already loaded on every Ultra page. Sticky headers, row hover, truncation, and frozen columns are added via a minimal scoped `<style>` block using utility classes (`bb-s0`, `bb-s1`, `bb-trunc`).
- **Frozen columns**: Avatar (`bb-s0`, `left:0`) and Name (`bb-s1`, `left:52px`) use `position:sticky` so they remain anchored during horizontal scroll. A subtle `box-shadow` on the Name column marks the freeze boundary. Corner header cells are promoted to `z-index:3` to sit above both the sticky top headers and the sticky left columns.
- **Sortable dates**: A `fmtDate()` helper formats ISO timestamps as `yyyymmdd-hh:mm` (local time) so the column sorts correctly as plain text in Excel without needing date parsing.
- **Theme color**: The header bar uses `var(--bb-theme-primary-color, #1d3557)`, which automatically picks up any institution-level color theme configured in Blackboard LMS.
- **CSV encoding**: Output is prefixed with a UTF-8 BOM (`﻿`) so Excel auto-detects encoding for names with accents, emoji, or non-ASCII characters.
- **CSS rules**: Each CSS rule is kept on a single line in the source to simplify minification.

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
