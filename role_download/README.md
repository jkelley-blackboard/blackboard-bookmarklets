# Blackboard Role Download Bookmarklet

This bookmarklet allows Blackboard administrators to **export role privileges** for both **System Roles** and **Course Roles**, as a JSON file (for use with the [Role Compare](../role_compare/) / [Role Privileges Utility](../role_privliges_utility/) bookmarklets) or as a CSV file in Blackboard's own native Manage Privileges import/export format.

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
5. Click **Download JSON** or **Download CSV (Blackboard Import Format)** in the floating panel.
6. Save the generated file.

---

## JSON Output

Example:

```json
{
  "source": {
    "roleType": "System",
    "bbDeployment": "university.blackboard.com",
    "role": "Administrator",
    "timestamp": "2025-09-21T18:25:40.512Z",
    "bbVersion": "3900.91.0-rel.21+f6adf77"
  },
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
```

This JSON is the format consumed by [Role Compare](../role_compare/) and [Role Privileges Utility](../role_privliges_utility/) for uploading/comparing against a page.

---

## CSV Output (Blackboard Import Format)

Blackboard added a native **import and export privileges** feature for System and Course roles in the [December 2025 release](https://help.anthology.com/blackboard/administrator/en/whats-new/2025-archived-release-notes/december-2025-release-notes--4000-4-.html#import-and-export-privileges-for-system-and-course-roles). The **Download CSV** button produces a file in that exact format — 3 columns, UTF-8 BOM, `true`/`false` permitted flags — so it can be fed straight back into Blackboard's own **Import** feature on the Manage Privileges page to clone or bulk-set a role, in addition to being usable for this tool's own compare workflow.

```
"Privileges","Permitted","Entitlement ID"
"Manage Courses","true","course.manage"
"View Grades","false","grades.view"
```

The file is named `<Role Name>_privileges.csv`, matching Blackboard's own export naming. Note that the native format has no "inherited" state — only `true`/`false` — so inherited privileges are written out as `false`.
