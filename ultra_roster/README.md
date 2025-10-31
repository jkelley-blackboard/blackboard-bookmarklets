# Blackboard Course Roster Bookmarklet

This bookmarklet allows instructors to generate a full course roster directly from the Blackboard Ultra interface. It pulls all enrolled users via the REST API, enriches the data with course roles, and displays a responsive, print-friendly table including avatars, names, pronouns, and more.

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
- Responsive table that is print-friendly.
- Overlay with Close (`✖`) and Print (`🖨`) buttons.
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
4. Use the **Close** button to dismiss or **Print** to open a print-friendly view.

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
- **Responsive Table**:
  - Horizontal scrolling on small screens.
  - Print media query for optimized landscape printing.
  - Min-width ensures table columns do not collapse.

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

MIT License — Anthology retains rights.
