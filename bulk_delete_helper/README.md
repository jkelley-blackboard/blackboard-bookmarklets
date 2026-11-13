# Bulk Delete Helper

Prepares the course Bulk Delete page in Blackboard LMS in one click. It selects every delete option, types `Delete` in the confirmation box, and opens a panel that names the target course and lists each option it selected, so an administrator can review everything before submitting. The bookmarklet never submits the form itself. It is useful after a term purge that leaves straggler courses behind: removing all of a course's content first usually lets the course delete succeed on the next try.

Based on a bookmarklet by Bradley Lawton, shared with the Blackboard community.

---

## Features

- Selects every option on the Bulk Delete page and fills in the `Delete` confirmation
- Shows the target course (Course ID, name and primary key) from the REST API, so you can confirm you are on the right course
- Lists each selected option by its on-page label, grouped into **Content areas** (named after the course's own menu, such as Information and Content) and **Other materials** (Announcements, Users, Groups and so on), with counts
- Warns when **Users** is selected, because that also removes every enrollment from the course
- **Undo:** restores the selections and the confirmation box to how they were before the bookmarklet ran
- Brings the confirmation box into view; nothing is deleted until you click **Submit** at the bottom right of the page
- Runs only on the Bulk Delete page; anywhere else it shows a message and changes nothing

---

## Installation

1. Open the live docs page: https://jkelley-blackboard.github.io/blackboard-bookmarklets
2. Find **Bb Bulk Delete Helper** under **Other Tools**.
3. Drag it to your bookmarks bar (or copy the code into a new bookmark's URL field).

---

## Usage

1. Sign in to Blackboard LMS as an administrator.
2. Go to **Administrator Panel > Courses** and search for the course.
3. Open the course's menu and choose **Bulk Delete**.
4. Click the bookmarklet. The panel shows the course and the options it selected.
5. Check the course and the list. To keep something, untick it on the page. To back out completely, click **Undo** or simply leave the page.
6. Click **Submit** at the bottom right of the page to run the delete. (The cursor is left in the confirmation box, so pressing the Enter key on your keyboard does the same.)

### Notes & Troubleshooting

- **Deletion is permanent.** Bulk Delete removes course content and it cannot be restored. Test in a non-production environment first, and run the bookmarklet only on courses you mean to empty.
- **Users removes enrollments.** Selecting every option includes **Users**, which removes every enrollment from the course. Untick it on the page before submitting if the enrollments should stay.
- **Content area names vary by course.** Content areas are listed under the names in the course's own menu (for example Information and Content). Ultra courses show their internal areas as ROOT, INTERACTIVE and INDIRECT.
- **"Please open the course Bulk Delete page first":** the bookmarklet only runs on `/webapps/blackboard/execute/recycler` with `sourceType=COURSES`, and only when the page has its option checkboxes and confirmation box. Open Bulk Delete from the course's menu in **Administrator Panel > Courses** and run it again.
- **Course name not shown:** the name comes from the REST API using `course_id` in the page address. If the lookup fails, the panel shows the primary key only; check the course named on the page before submitting, and see the browser console for the error.
- **Some options were not selected:** options the page has disabled are left alone.
- **Straggler courses after a purge:** run Bulk Delete with every option selected, then delete the course again from **Administrator Panel > Courses**.

---

## File Structure

```
bulk_delete_helper/
├── bulk_delete_helper_bookmarklet.js          # Readable annotated source
├── bulk_delete_helper_bookmarklet.min.bk.js   # Minified bookmarklet
└── README.md                                  # This file
```

---

## Development / Implementation Notes

- **Page:** `/webapps/blackboard/execute/recycler?course_id=_123_1&action=select&context=SYSTEM&sourceType=COURSES`, an Original admin page inside the Ultra admin iframe (`iframe[name="bb-base-admin-iframe"]`). The guard requires that path, `sourceType=COURSES`, the `input[name="selections"]` checkboxes and the `#confirmation` box. It checks the admin iframe first and falls back to the top document when the page is opened outside the frame.
- **Form changes:** each checkbox is set with `checked = true` and the confirmation with `value = 'Delete'`, and each change dispatches `change` (and `input` for the text box) so any page script listening for them sees the update. The original values are kept for **Undo**.
- **Course context:** `GET /learn/api/public/v1/courses/{course_id}?fields=courseId,name`, sent only when `course_id` looks like a primary key (`_123_1`).
- **Option labels:** taken from `label[for=<checkbox id>]`, then the enclosing `label`, then the enclosing row, falling back to the checkbox value.
- **Grouping:** a checkbox whose value is a primary key (`_123_1`) is a content area; any other value (`ANNOUNCMENTS`, `USERS`, `GROUPS` and so on) is an other material. The Users warning appears when the `USERS` option is selected.
- **Tested** in the Ultra admin frame on an Original course and with the page opened directly on an Ultra course (2026-11-13).
- **Attribution:** the one-click approach (select all options, fill the confirmation, let the administrator submit) comes from Bradley Lawton's original bookmarklet. This version adds the page guard, the course confirmation, the option list, Undo and the native panel.
- Uses the shared `esc()`, `getAdminFrameDocument()`, `getUltraTheme()`, `ensurePanel()` and `addBtn()` helpers from [SHARED_FUNCTIONS.md](../SHARED_FUNCTIONS.md). The panel takes its colors, font and shadow from Ultra's theme tokens, with Ultra's default theme as the fallback.

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
