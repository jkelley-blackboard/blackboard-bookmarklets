# Blackboard Bookmarklets

This repository contains a set of bookmarklets for Blackboard administrators to **download, compare, and inspect role privileges** and **view analytics IDs**.

---

## Bookmarklets

| Name | Description | Folder |
|------|-------------|--------|
| **Role Download** | Download role privileges to a JSON file for **System** or **Course** roles. | [role_download](./role_download) |
| **Role Compare** | Compare current role privileges with a previously downloaded JSON file and highlight mismatches. | [role_compare](./role_compare) |
| **Analytics ID Hover** | Highlight page elements with `data-analytics-id` or `analytics-id` attributes and show their IDs on hover. | [view_analytics_ids](./view_analytics_ids) |

---

## Usage

Each folder contains:

- The **bookmarklet code** (`.js`)  
- A **README.md** with usage instructions, JSON format (if applicable), and safety notes

To use a bookmarklet:

1. Copy the code from the `.js` file.
2. Create a new browser bookmark.
3. Paste the code as the bookmark URL.
4. Navigate to the appropriate Blackboard page and click the bookmarklet.

---

## Notes

- All bookmarklets are **read-only** and **do not submit any data**.
- Pagination may prevent full downloads; ensure all privileges are visible before downloading or comparing.
