# Orphan Grade Column Scanner Bookmarklet

The **Orphan Grade Column Scanner** helps Blackboard administrators and instructors identify grade columns that have no corresponding content item in the course content tree. These orphaned columns can accumulate silently over time — most often after course copies where third-party LTI tools re-register new grade columns, leaving prior-term columns behind with no content link.

---

## Features
- Identifies **orphaned grade columns** — columns that exist in the gradebook but have no linked content item.
- Distinguishes between columns **visible in the instructor gradebook** and columns **hidden from the instructor view** (`visibleInBook: false`), which cannot be found or deleted through the normal UI.
- Classifies **external gradable items** (discussions, journals, wikis, LTI tools) that have a broken content ID but match a content item by name — these are informational and likely fine.
- Displays results in a **floating panel** injected into the page — no page reload required.
- Shows **provider type** (LTI, Discussion, Journal, Wiki, Blog) for each flagged column.
- Includes an **Export CSV** button for reporting and follow-up.
- Works from **any page inside a Blackboard Ultra course** — does not require the gradebook view to be open.
- Pure JavaScript — **no external dependencies** required.
- Safe to run multiple times — replaces the existing panel on each run.

---

## Installation
1. Open the hosted index page https://jkelley-blackboard.github.io/blackboard-bookmarklets
2. Find **Orphan Grade Column Scanner** under the **Gradebook Tools** section.
3. Drag the button to your browser's bookmarks bar (or create a new bookmark and paste the bookmarklet code as the URL).

---

## Usage
1. Log into Blackboard and navigate to any page inside a course (the gradebook, course content, or any page with the course ID in the URL).
2. Click the **Orphan Grade Column Scanner** bookmarklet from your bookmarks bar.
3. A loading panel appears immediately in the top-right corner of the page.
4. Results populate within a few seconds. Three sections are shown:

| Section | Color | Meaning |
|---|---|---|
| **Orphaned — visible in gradebook** | Red | Column has no content link and is visible to the instructor. Can be located and deleted manually via Gradebook Settings. |
| **Orphaned — hidden from gradebook** | Amber | Column has no content link and is hidden from the instructor gradebook view. Must be managed via Gradebook Settings → Items Management or the REST API. |
| **External gradable item — likely ok** | Blue | Column has a broken or missing content ID but matches a content item by name. Typically a discussion, journal, wiki, or LTI tool. No action needed. |

5. Click **Export CSV** to download a full report.

### Notes & Troubleshooting
- The bookmarklet reads the course ID from the URL. If the URL does not contain a Blackboard course ID, you will see: `"Navigate to a Blackboard course page first."`
- You must be logged into Blackboard in the same browser session.
- Results are fetched live from the Blackboard REST API — no data is stored or transmitted externally.

---

## File Structure
```
orphan_grades/
├── orphan_grades_bookmarklet.js          # Annotated development file
├── orphan_grades_bookmarklet.min.bk.js  # Minified bookmarklet for distribution
└── README.md                            # This file
```

---

## Development / Implementation Notes
- The bookmarklet fetches data from two Blackboard REST API endpoints:
  - **Private API** `/learn/api/v1/courses/{id}/gradebook/columns` — full column metadata including `visibleInBook`, `calculationType`, `scoreProviderHandle`, `contentId`, and `dueDate`.
  - **Public API** `/learn/api/public/v1/courses/{id}/contents` — the full recursive content tree with grade column cross-references via `contentHandler.gradeColumnId`.
- A grade column is classified as orphaned when its ID does not appear in the content tree's `gradeColumnId` references, its `contentId` (if present) does not resolve to a content item, and no content item title matches the column name.
- Name matching is case-insensitive and covers all external gradable types — discussions, journals, wikis, blogs, and LTI tools — without requiring a separate API call per type.
- System columns (`calculationType` of `CUSTOM` or `CALCULATED`, and common calculated column names) are excluded from analysis.
- The `visibleInBook` field from the private API determines whether a column is reachable through the instructor UI. Columns with `visibleInBook: false` are reported separately as they require API or Settings access to manage.
- Pagination is handled automatically — all columns and content items are fetched regardless of course size.
- The panel is injected as a fixed-position overlay and does not interfere with normal page functionality. Running the bookmarklet a second time replaces the existing panel.

---

## Security & Disclaimer
This bookmarklet is **experimental** and provided **as-is**, without warranty or official support. Use at your own risk. It is intended for Blackboard LMS (SaaS/Ultra) environments and may not be compatible with older or heavily customized Blackboard installations.

If you plan to share this tool with other administrators or instructors, consider reviewing your institution's policy for deploying custom scripts and tools.

---
