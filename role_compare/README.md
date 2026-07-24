# ⚠️ Warnings / To-Do
1. **Multi-select awareness:** The Blackboard table’s built-in multi-select checkboxes are **not aware of the custom filters**. If you filter rows (Mismatch, Permit, Restrict), the hidden rows may still be selected.  
   **Action:** Disable multi-select or inject logic to sync selection state with filters.
2. **Role type validation:** The bookmarklet does **not currently check** if the uploaded JSON’s `roleType` matches the page type (System vs Course).  
   **Action:** Add a validation step to compare `data.source.roleType` with the `type` query parameter and warn the user if they differ.
3. **Match on entitlement:** It is probably safer to compare based on the entitlement rather than the privlige name.  (This might make it more locale agnostic.)
   **Action:** Change compare key to entitlement.  

---

# Blackboard Role Compare Bookmarklet

This bookmarklet allows administrators to **compare the current Blackboard role privileges** with a previously downloaded JSON file, or with a CSV file in Blackboard's native Manage Privileges import/export format, and quickly identify mismatches.

---

## ✅ Supported Pages

| Role Type       | URL |
|-----------------|-----|
| **System Role** | `/webapps/blackboard/execute/managePrivileges?type=System` |
| **Course Role** | `/webapps/blackboard/execute/managePrivileges?type=Course` |

The bookmarklet **requires that all privileges are displayed** on one page (**Show All** enabled).

---

## ✅ Key Features

- Displays **SOURCE details** from the uploaded JSON (`source` object) as **one line per key-value pair**:
  ```
  roleType = Course
  bbDeployment = nahe.blackboard.com
  role = Course Builder/Organization Builder
  timestamp = 2025-09-26T20:49:41.374Z
  bbVersion = 3900.125.0-rel.36
  ```
- Adds **⚠ icons** next to mismatched privileges:
  - Tooltip shows:
    - **“Source is Permitted”** when expected = permitted and actual = restricted
    - **“Source is Restricted”** when expected = restricted and actual = permitted
    - **“Mismatch”** for all other differences
- **No row highlighting**—icons and tooltips only
- **Diagnostics**:
  - Lists privileges **in JSON but not on page**
  - Lists privileges **on page but not in JSON**

---

## ✅ Usage

1. Copy the bookmarklet code from `blackboard_role_compare_bookmarklet.js`.
2. Create a new browser bookmark:
   - **Name:** `BB Compare Privileges`
   - **URL:** Paste the code.
3. Navigate to the correct **Manage Privileges** page in Blackboard.
4. Click **Show All** on the page (required).
5. Click the bookmarklet:
   - Use **Upload JSON / CSV** to select a previously downloaded role JSON file, or a CSV file in Blackboard's native Manage Privileges import/export format (added in the [December 2025 release](https://help.anthology.com/blackboard/administrator/en/whats-new/2025-archived-release-notes/december-2025-release-notes--4000-4-.html#import-and-export-privileges-for-system-and-course-roles)) — the file is detected automatically by extension.
   - The floating panel will display:
     - **SOURCE details** from the uploaded file
     - **Filter buttons** for mismatches
     - A summary and diagnostics section
6. Hover over ⚠ icons to see mismatch details.

---

## ✅ CSV Support

CSV uploads use Blackboard's native 3-column format (`Privileges`, `Permitted`, `Entitlement ID`), the same file produced by Blackboard's own Manage Privileges **Export** button or by this repo's [Role Download](../role_download/) bookmarklet's **Download CSV** button. Because the native format has no "inherited" state, CSV-sourced comparisons treat any row with `Permitted=false` as **restricted**, even if the page shows it as inherited.

---

## ✅ Filters (after JSON upload)

- **Mismatch** → Show all mismatched privileges
- **Permit** → Show mismatches where **expected = permitted** and **actual = restricted**
- **Restrict** → Show mismatches where **expected = restricted** and **actual = permitted**
- **Show All** → Clear filters
- **Refresh Page** → Reload the current page

---

## ✅ Safety Notes

- **Read-only:** No changes are made to Blackboard data.
- **Pagination required:** All privileges must be visible on one page (**Show All**).
- **Role type validation:** Currently **not enforced** (see Warnings).

---

### ✅ What’s New in This Version
- **SOURCE section**: Displays key-value pairs instead of raw JSON.
- **No auto “Show All”**: The user must manually click Show All before running the bookmarklet.
- **Improved tooltips** for mismatches.
- **No row highlighting**—cleaner UI.
- **Filter logic updated** to match your exact requirements.
