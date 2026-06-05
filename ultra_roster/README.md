# Blackboard Course Roster Bookmarklet

This bookmarklet allows instructors to generate a full course roster directly from the Blackboard Ultra interface. It pulls all enrolled users via the REST API, enriches the data with course roles, and displays a responsive, print-friendly table that blends seamlessly with the Ultra UI.

---

## Features

- Fetches enrolled users via the Blackboard REST API.
- Displays:
  - Avatar
  - Full Name
  - Username
  - Email
  - Student ID
  - Other/Preferred Name (with ✨ or ➕ icon for preferred display)
  - Pronouns
  - Pronunciation (text + 🔊 icon if audio exists)
  - Role (mapped to friendly `nameForCourses`)
  - Availability
  - Last Login
  - Last Access
- Native Ultra look and feel — table uses Blackboard Ultra's own MUI CSS classes (`MuiTable-root`, `MuiTableCell-root`, etc.) so styling automatically matches the page theme, including institution color overrides via `--bb-theme-primary-color`.
- Responsive overlay with a branded header bar, horizontal table scrolling, sticky column headers, and row hover highlights.
- Overlay buttons: Close (`✖`), Print (`🖨`), and Download CSV (`⬇`).
- CSV export includes all columns except Avatar; UTF-8 BOM ensures correct encoding in Excel.
- Collapses to full-screen on narrow viewports.
- Fully dynamic, works on any course roster page.

---

## Installation

1. Open your browser’s bookmarks/favorites manager.
2. Create a new bookmark.
3. Set the URL to the one-liner version of the bookmarklet (minified script).
4. Save.

---

## Usage

1. Navigate to any Blackboard Ultra course roster page (URL contains `/outline/roster`).
2. Click the bookmarklet.
3. A popup overlay will appear with a responsive roster table.
4. Use the **Close** button to dismiss, **Print** to open a print-friendly view, or **Download CSV** to save the roster as a `.csv` file named `{courseId}_roster.csv`.

---

## Technical Details

- **Course ID Extraction**: Automatically reads the course ID from the URL.
- **REST API Calls**:
  - `GET /learn/api/public/v1/courses/{courseId}/users?expand=user` – fetches enrolled users.
  - `GET /learn/api/public/v1/courseRoles?fields=roleId,nameForCourses` – maps role IDs to friendly names.
  - `GET /learn/api/public/v1/courses/{courseId}?fields=id,courseId,name` – fetches course name and ID.
- **Preferred Names & Icons**:
  - If `preferredDisplayName` is `"OtherName"`, an ✨ icon is displayed next to the “Other Name”.
  - If `"Both"`, a ➕ icon is displayed.
- **Pronunciation Field**:
  - Displays the text value if present.
  - Adds 🔊 icon if audio exists.
- **Native Ultra Styling**:
  - Uses Blackboard Ultra's own MUI table classes so the overlay inherits the page's live theme, including any institution-level color customizations.
  - Header bar uses the `--bb-theme-primary-color` CSS custom property as its background.
  - Sticky `<thead>` keeps column headers visible while scrolling large rosters.
  - Row hover highlight matches MUI's standard interaction pattern.
- **Responsive Layout**:
  - Overlay floats with a 12px inset and rounded corners on desktop.
  - Collapses to full-screen (no inset, no border-radius) on viewports ≤ 768px.
  - Horizontal table scrolling when columns exceed viewport width.
  - Print media query renders in landscape with the primary-color header preserved.

---

## Dependencies

- Pure JavaScript; no external libraries required.
- Runs directly in the browser console or as a bookmarklet.

---

## Notes

- Ensure you are on a course roster page (`/outline/roster`) before running the bookmarklet.
- The bookmarklet will not modify Blackboard data—it only reads API responses.
- For large courses, the API response may take a few seconds.

---

## License

MIT License — Blackboard retains rights.
