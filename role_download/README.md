# Blackboard Role Download Bookmarklet

This bookmarklet allows Blackboard administrators to **export role privileges** to a JSON file for both **System Roles** and **Course Roles**.

---

## Supported Pages

| Role Type      | URL |
|----------------|-----|
| **System Role** | `/webapps/blackboard/execute/managePrivileges?type=System` |
| **Course Role** | `/webapps/blackboard/execute/managePrivileges?type=Course` |

The bookmarklet **verifies the page type** and will show a warning if used on the wrong page.

---

## Usage

1. Copy the bookmarklet code from `blackboard_role_download_bookmarklet.js`.
2. Create a new browser bookmark:
   - **Name:** `BB Download Privileges`
   - **URL:** Paste the code.
3. Navigate to the correct **Manage Privileges** page in Blackboard.
4. Ensure **all privileges are displayed** (no pagination warning).
5. Click the **Download** button in the floating panel.
6. Save the generated JSON file.

---

## JSON Output

Example:

```json
{
  "roleType": "System",
  "system": "university.blackboard.com",
  "role": "Administrator",
  "timestamp": "2025-09-21T18:25:40.512Z",
  "privileges": {
    "Manage Courses": {
      "status": "permitted",
      "entitlement": "course.manage"
    },
    "View Grades": {
      "status": "inherited",
      "entitlement": "grades.view"
    }
  }
}
