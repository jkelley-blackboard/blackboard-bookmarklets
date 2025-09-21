# Blackboard Role Compare Bookmarklet

This bookmarklet allows administrators to **compare the current Blackboard role privileges** with a previously downloaded JSON file.

---

## Supported Pages

| Role Type      | URL |
|----------------|-----|
| **System Role** | `/webapps/blackboard/execute/managePrivileges?type=System` |
| **Course Role** | `/webapps/blackboard/execute/managePrivileges?type=Course` |

The bookmarklet ensures the JSON file **matches the role type** on the page.

---

## Usage

1. Copy the bookmarklet code from `blackboard_role_compare_bookmarklet.js`.
2. Create a new browser bookmark:
   - **Name:** `BB Compare Privileges`
   - **URL:** Paste the code.
3. Navigate to the correct **Manage Privileges** page in Blackboard.
4. Ensure **all privileges are displayed** (no pagination warning).
5. Click **Upload JSON** and select a previously downloaded role JSON file.
6. The table updates with:
   - ⚠️ icons showing privilege mismatches.
   - Hover over icons to see **expected vs actual** status.

---

## Table Filters

After uploading JSON, you can filter rows using buttons in the floating panel:

- **Show Permitted Mismatches**
- **Show Restricted Mismatches**
- **Show All Mismatches**
- **Show All**
- **Refresh Page**

---

## Safety Notes

- **Read-only:** No changes are made to Blackboard data.
- **Role type validation:** The bookmarklet will warn if JSON does not match current page (System vs Course).
- **Pagination required:** All privileges must be visible on one page.
