# Role Privileges Utility (Bookmarklet)

A lightweight admin helper for Blackboard’s **Manage Privileges** page.

## What it does

- Displays an on-page **control panel**.
- **Toggles** entitlement codes beside each privilege name.
- **Exports** the current privileges to a **pretty‑printed JSON** file, or to a **CSV** file in Blackboard's native Manage Privileges import/export format.
- **Uploads** a JSON or CSV file to **compare**, flags mismatches with ⚠, and provides quick **filters**.
- Keeps **Select‑All** behavior scoped to **visible rows** when filters are active.

> ✅ Built specifically for the **Manage Privileges** page with **Show All** enabled.

---

## Known isssues

- **Mult-select checkboxes are disabled** when filters are applied.
  This was to avoid mistakenly checking hidden rows.  Fix TBD.

---

## Requirements

- **Page**: URL contains `/webapps/blackboard/execute/managePrivileges`
- **Show All**: The page must be opened with `showAll=true` (click the **Show All** button first).
- **DOM scope**: Data rows are read **strictly** from:
  ```html
  <tbody id="listContainer_databody"> … </tbody>
  ```

---

## Design Notes

- **Single source of truth**: All row data (entitlement, name, status) is parsed by a single function `readRow(tr)`.
- **Name extraction** ignores the entitlement pill injected by this tool to keep JSON clean.
- **Timestamp** in `source.timestamp` always uses `new Date().toISOString()` at download time.
- **Pretty JSON**: Saved with 2‑space indentation and a trailing newline.
- **PAGE CONTEXT** (host, roleType, role, bbVersion) is rendered **at the top of the panel** when it opens.
- **Download flow**: Does **not** render any extra details in the panel.
- **No validation** of uploaded entitlement key format—keys are compared as-is.

---

---

## Usage

1. Go to **System Admin → Manage Privileges**.
2. Click **Show All** (required).
3. Click your **Role Privileges Utility** bookmarklet.
4. Use the panel:
   - **Toggle Entitlements**: show/hide entitlement code pills next to names.
   - **Download JSON**: saves `bb_role_{type}_{role}_{timestamp}.json`, pretty‑printed.
   - **Download CSV (Blackboard Import Format)**: saves `{role}_privileges.csv`, matching Blackboard's own native Manage Privileges import/export format so it can be re-imported into Blackboard directly.
   - **Upload JSON / CSV (Compare)**: choose a prior JSON export, or a native Blackboard CSV export, to flag differences. Format is detected automatically by file extension.
   - **Filters**: `Mismatch`, `Permit` (expected permitted but actual restricted), `Restrict` (expected restricted but actual permitted), `Show All`.
   - **Refresh Page**: reloads the framed content.

---

## CSV Support (Blackboard Import Format)

Blackboard added a native **import and export privileges** feature for System and Course roles in the [December 2025 release](https://help.anthology.com/blackboard/administrator/en/whats-new/2025-archived-release-notes/december-2025-release-notes--4000-4-.html#import-and-export-privileges-for-system-and-course-roles). Its format is a simple 3-column CSV:

```
"Privileges","Permitted","Entitlement ID"
"Manage Courses","true","course.manage"
"View Grades","false","grades.view"
```

- **Download CSV** produces this exact format (UTF-8 BOM, `true`/`false`, quoted fields), so the file can be fed straight back into Blackboard's own **Import** feature to clone or bulk-set a role — not just used by this tool.
- **Upload (Compare)** accepts this format as an alternative to the tool's own JSON. Since the native format has no "inherited" state, any row with `Permitted=false` is treated as **restricted** for comparison purposes, even if the page shows it as inherited.
- Comparison for CSV uploads matches by **Entitlement ID**, same as JSON uploads.

---

## JSON Structure

```json
{
  "source": {
    "roleType": "System|Course|Organization|Support|…",
    "bbDeployment": "your.blackboard.host",
    "role": "Exact role name from page title",
    "timestamp": "2025-09-28T21:39:14.123Z",
    "bbVersion": "… (if detected)"
  },
  "privileges": {
    "some.entitlement.KEY": {
      "status": "permitted|restricted|inherited",
      "name": "UI label of the privilege"
    }
  }
}
```

- During **comparison**, `inherited` is treated as **permitted** for the purpose of mismatch detection.

---

## Comparison Logic

For each entitlement on the page:

- **Actual**: determined from the page row (icons/labels).
- **Expected**: taken from the uploaded JSON’s `privileges[entitlement].status`.
- A **mismatch** is counted when **expected ≠ actual**, after mapping `inherited → permitted`.

Additional diagnostics:

- **In JSON but not on page**: entitlements present in your file but absent on the current page.
- **On page but not in JSON**: entitlements on the page not found in your file.

Filters:

- **Mismatch**: only rows with differences.
- **Permit**: rows where the file expects **permitted** but page shows **restricted**.
- **Restrict**: rows where the file expects **restricted** but page shows **permitted**.
- **Show All**: show everything and restore default Select‑All behavior.

**Select‑All behavior**:

- When a filter is active, Select‑All toggles **only visible rows**.
- When you click **Show All**, Select‑All returns to **normal** behavior.

---

## Troubleshooting

- **“Go to the manage privileges page”**  
  You’re not on the correct URL. Navigate to the Manage Privileges page.

- **“Show All is required”**  
  Click **Show All** on the page, then run the bookmarklet again.

- **No entitlement pills appear**  
  Ensure you’re on the correct page, **Show All** is enabled, and rows exist under `#listContainer_databody`.

- **Download works but names look wrong**  
  The script strips out the injected entitlement pill from `<th>` when capturing the name. If you still see issues, the page markup may differ; file an issue with example HTML.

- **Upload JSON / CSV (Compare) does nothing**  
  Make sure the uploaded file contains a top-level `privileges` object (JSON) or at least one valid data row (CSV). Role type mismatches (e.g., comparing a Course-role JSON on a System-role page) will show a warning and stop.

---

## Security & Privacy

- All operations are **client‑side** (runs in your browser on the admin page).
- No data is sent to external services.
- Downloaded files are generated in memory.

---


### Minification

This script was minified using https://www.uglifyjs.net/.
