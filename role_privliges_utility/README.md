# Role Privileges Utility (Bookmarklet)

A lightweight admin helper for Blackboard’s **Manage Privileges** page.

## What it does

- Displays an on-page **control panel**.
- **Toggles** entitlement codes beside each privilege name.
- **Exports** the current privileges to a **pretty‑printed JSON** file.
- **Uploads** a JSON file to **compare**, flags mismatches with ⚠, and provides quick **filters**.
- Keeps **Select‑All** behavior scoped to **visible rows** when filters are active.

> ✅ Built specifically for the **Manage Privileges** page with **Show All** enabled.

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
   - **Upload JSON (Compare)**: choose a prior export to flag differences.
   - **Filters**: `Mismatch`, `Permit` (expected permitted but actual restricted), `Restrict` (expected restricted but actual permitted), `Show All`.
   - **Refresh Page**: reloads the framed content.

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

- **Upload JSON (Compare) does nothing**  
  Make sure the uploaded file contains a top-level `privileges` object. Role type mismatches (e.g., comparing a Course-role JSON on a System-role page) will show a warning and stop.

---

## Security & Privacy

- All operations are **client‑side** (runs in your browser on the admin page).
- No data is sent to external services.
- Downloaded files are generated in memory.

---


### Minification

This script was minified using https://www.uglifyjs.net/.
