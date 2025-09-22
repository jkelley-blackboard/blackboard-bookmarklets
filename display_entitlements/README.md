# Display Entitlements Bookmarklet

The **Display Entitlements** bookmarklet helps Blackboard administrators quickly view the underlying **entitlement IDs** for each privilege when managing course or system roles. This is useful for troubleshooting, documentation, or working with Blackboard APIs.

---

## Features
- Displays the hidden **checkbox values (entitlement IDs)** directly in the privileges table.  
- Works inside the **Admin Panel → Users → Manage Privileges** interface.  
- Adds the IDs next to each privilege without modifying existing functionality.  
- Pure JavaScript — **no jQuery dependency** required.  
- Safe to run multiple times — prevents duplicate entries.

---

## Installation
1. Open the hosted index page https://jkelley-blackboard.github.io/blackboard-bookmarklets
2. Find **Display Entitlements** under the **Roles & Entitlements Tools** section.  
3. Drag the button to your browser's bookmarks bar (or create a new bookmark with the bookmarklet code).

---

## Usage
1. In Blackboard navigate to:
**Admin Panel → Users → Manage Privileges**.
2. Make sure the Manage Privileges UI is visible (this bookmarklet targets the admin iframe).  
3. Click the **Display Entitlements** bookmarklet from your bookmarks bar.
4. The page will update to show each entitlement's internal ID next to the privilege name.

### Notes & Troubleshooting
- This tool targets the `bb-base-admin-iframe` iframe. If the iframe is not present or not loaded, you will see:
"⚠ Go to Admin > Users to manage role privileges."

- The bookmarklet also checks you are on the Manage Privileges page inside the iframe by verifying the path includes:
/webapps/blackboard/execute/managePrivileges



---

## File Structure
display_entitlements/
├── display_entitlments_bookmarklet.js # Main development file
├── display_entitlments_bookmarklet.min.bk.js # Minified bookmarklet for distribution
├── display_entitlments_original.js # Older/original variant (kept for reference)
└── README.md # This file


> **Note:** Filenames in this folder use the `display_entitlments_*` pattern (intentional to match the repo).

---

## Development / Implementation Notes
- The bookmarklet runs entirely in the iframe's `contentDocument` to avoid cross-frame DOM issues.
- It looks for rows under `tbody#listContainer_databody > tr`, reads the checkbox `value` (the entitlement ID), and appends a small element (class `uid-display`) into the row header (`th`).
- The script prevents duplicate appends by checking for an existing `.uid-display` node before inserting.
- No external libraries are required — the code is written in modern JavaScript (ES6+), so it is small and bookmarklet-friendly.

---

## Security & Disclaimer
This bookmarklet is **experimental** and provided **as-is**, without warranty or official support. Use at your own risk. It is intended for Blackboard Learn SaaS environments and may not be compatible with older or heavily customized Blackboard installations.

If you plan to share this tool with other admins, consider reviewing your institution's policy for deploying custom scripts/tools.

---