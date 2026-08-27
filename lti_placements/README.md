# LTI Placements Viewer

Displays all LTI placements registered on a Blackboard LMS instance, grouped by domain, with live search, filtering, and CSV export.

---

## Usage

Run from any Blackboard page while logged in as an administrator. No specific page is required — the bookmarklet calls the REST API using your existing session.

Click the bookmarklet to open the panel. Click it again (or press **Escape**) to close it.

---

## What It Shows

Placements are grouped by their registered domain (e.g. "Microsoft Teams for Learn Ultra", "Extensions-stage"). Each group shows:

- **Placement icon** (if the tool provider registered one) and **name**, linked directly to the placement's edit page in the Original admin console (`.../execute/blti/modifyPlacement?cmd=edit&placementId=...&domainConfigId=...`)
- Description (if present)
- **Launch URL**
- **Type** — e.g. Application, Administrator, UltraUI, System, CourseNavigation
- **Availability** — whether the placement is currently available
- **Students / Grading** flags where applicable

---

## Filtering

- **Search** — filters across placement name, description, URL, and domain name
- **Type** — dropdown populated from the types present on the system
- **Status** — Available or Unavailable

---

## CSV Export

The **⬇ CSV** button downloads the current filtered view as a dated CSV file with columns:

`Domain, Primary Domain, Name, Type, Available, Allow Students, Allow Grading, URL, Description, Edit Link, Icon URL`

---

## API Endpoints Used

Both calls use your active browser session — no API key or token required.

| Endpoint | Purpose |
|---|---|
| `GET /learn/api/public/v1/lti/placements` | All registered placements |
| `GET /learn/api/public/v1/lti/domains` | Domain names and metadata for group headers |

Results are paginated automatically — all placements are retrieved regardless of how many there are.

---

## Requirements

- Logged in to Blackboard LMS as an administrator
- Entitlement to access LTI Tool Providers (`System Admin > Integrations > LTI Tool Providers`)

---

## Notes

- Read-only — no data is modified
- Re-running the bookmarklet on the same page toggles the panel closed
