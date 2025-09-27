# Role Privileges Utility

All-in-one helper for Blackboard **Manage Privileges**:

- **Toggle Entitlements** – show/hide entitlement codes as a small badge next to each privilege name.
- **Download JSON** – export strict **entitlement‑keyed** JSON (includes display names).
- **Upload JSON (Compare)** – compare strict entitlement‑keyed JSON and flag mismatches with filters.
- **Select-All safety** – when a filter is active, header Select-All toggles **only visible rows**.

> **Requirements**: Open the role’s Manage Privileges page and click **Show All** before running.

---

## Install

Create a bookmark with the URL set to the contents of `role_privileges_utility.min.bk.js` (a single line beginning with `javascript:(...)`).

> We do **not** rely on external loaders due to CSP/policy constraints.

---

## Usage

1. Navigate to **Manage Privileges** (System or Course/Organization) and click **Show All**.
2. Click your bookmark to open the utility panel.
3. Use the buttons:
   - **Toggle Entitlements** – shows a small, gray badge (the entitlement) after each privilege name.
   - **Download JSON** – saves entitlement‑keyed v2 JSON:
     ```json
     {
       "source": {
         "roleType": "System | Course | Organization",
         "bbDeployment": "tenant.example.com",
         "role": "Role Name",
         "timestamp": "ISO-8601",
         "bbVersion": "optional"
       },
       "privileges": {
         "entitlement.id": { "status": "permitted|restricted", "name": "Human readable" }
       }
     }
     ```
     - Items with no detectable entitlement are omitted, and a count is shown.
   - **Upload JSON (Compare)** – accepts **strict entitlement‑keyed** JSON only.
     - Flags mismatches with ⚠ in the status column (with a helpful tooltip).
     - Filters: **Mismatch**, **Permit**, **Restrict**, **Show All**.
     - **Select All** patch: only visible rows are toggled while any filter is active.
   - **Refresh Page** – quick reset.

---

## Notes

- **Role name**: The display name is extracted from `#pageTitleText` by taking **text after the first colon**; for **Course/Organization** roles we normalize special characters `[\/\\:*?"<>|] → "_"` (collapse multiple `_`, trim).
- **Inherited = Permitted** for comparison.
- **Organization = Course** in the UI; we validate role type case‑insensitively.

---

## Troubleshooting

- **“Show All is required.”** – click **Show All** and re-run.
- **“JSON privileges must be entitlement‑keyed…”** – ensure your `privileges` object uses **entitlement IDs as keys**.
- **No entitlement on some rows** – themes differ; we look at the row checkbox first and then fall back to links, `data-*`, ids, and `<code>`.
- **Bookmarklet won’t run** – some orgs block `javascript:` URLs or CSP prevents script actions.

