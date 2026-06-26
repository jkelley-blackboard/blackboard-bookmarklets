# Student Grade Print

Opens a clean, print-ready view of an individual student's gradebook as seen by an instructor in Blackboard Ultra. Extracts the student's name, username, system ID, last access date, current grade, and all grade items — including due dates, submission status, grades, and late or formative flags — then renders them in a formatted pop-up window ready to print or save as PDF. Automatically pages through all pages of grade items before opening the print window.

---

## Features

- Automatically collects all pages of grade items (handles > 19 items)
- Displays student name, username, ID, and last access date
- Shows current overall grade at a glance
- Lists all grade items with due date, status, and grade value
- Color-codes grade values (green for excellent, red for failing, neutral for ungraded)
- Flags late submissions and formative items with sub-labels
- Shows total item count in the print footer
- No external dependencies — runs entirely in the browser

---

## Installation

1. Open the hosted index page at https://jkelley-blackboard.github.io/blackboard-bookmarklets
2. Find **Bb Student Grade Print** under the **Gradebook Tools** section.
3. Drag the button to your browser's bookmarks bar (or create a new bookmark and paste the bookmarklet code as the URL).

---

## Usage

1. Navigate to a course in Blackboard Ultra and open the Gradebook.
2. Click any student row to open the individual student grades side panel.
3. Ensure the **Grades** tab is selected in the panel (the default view).
4. Click the **Bb Student Grade Print** bookmarklet in your bookmarks bar.
5. The bookmarklet will automatically page through all grade items — you may briefly see the panel advance through pages.
6. A pop-up window opens with the complete print-ready grade view.
7. Click **Print** to send to a printer or save as PDF, or **Close** to dismiss.

### Notes & Troubleshooting

- If you see a pop-up blocker warning, allow pop-ups for your Blackboard domain and try again.
- The panel will visibly flip through pages while collecting data — this is expected. Do not click anything in the panel until the print window appears.
- If the panel does not appear to be detected, confirm the student grades side panel is open and not minimized (it must be the active `course.grades.peek` panel).
- If grade items are missing, confirm the **Grades** tab (not Progress, Notes, or Activity Log) is selected before running the bookmarklet.
- If a "timed out waiting for next page" alert appears, the page loaded slowly. Partial results will still print — re-run the bookmarklet to try again.
- If student metadata fields (username, ID, last access) are blank after a Blackboard update, the label/value selector pattern may need updating — open an issue with the page HTML.

---

## File Structure

```
student_grades_print/
├── student_grades_print_bookmarklet.js
├── student_grades_print_bookmarklet.min.bk.js
└── README.md
```

---

## Development / Implementation Notes

- **Panel detection:** Targets `.bb-offcanvas-panel[data-base-state-name="course.grades.peek"]` and checks that `aria-hidden` is not `true`.
- **Pagination:** The panel shows up to 19 items per page. The bookmarklet detects the Next Page button via `.js-pagination-page-up-button` and checks its `disabled` attribute to know when the last page is reached. After each `.click()`, it polls every 80ms for up to 5 seconds watching for the first visible item name to change, which confirms the DOM has re-rendered the new page. This avoids arbitrary `setTimeout` delays and handles slow network conditions gracefully.
- **Student metadata:** Reads label/value pairs from `[class*="userFieldContainer"]` elements, matched case-insensitively by label text.
- **Grade rows:** Selects `tr[data-testid^="course-student-grades-table-row-"]` — Blackboard stamps each row with the item name in `data-testid`, making row detection resilient to class name changes.
- **Grade color:** Inferred from the pill element's class list: `excellent` → green, `extremeFailing`/`Failing` → red, `grey` → neutral.
- **Print window:** Uses `window.open()` with an in-memory HTML document. The footer includes the total item count collected across all pages.
- **Known fragility:** `makeStyles*` suffixed class names change with Blackboard builds. All selectors use `[class*="partialName"]` substring matching to resist this. The `data-base-state-name` and `js-pagination-page-up-button` identifiers are the most stable hooks and the first things to check if the bookmarklet stops working.

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
