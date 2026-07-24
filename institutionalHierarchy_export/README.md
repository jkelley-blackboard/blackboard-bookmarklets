# Blackboard Learn Institutional Hierarchy Children Export (Bookmarklet & Script)

Exports all **descendant nodes** of a given Institutional Hierarchy node from Blackboard Learn using the REST API endpoint:

```
GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
```

This repository provides:

- A **one-line bookmarklet** you can save in your browser to download a pipe-delimited text file, a raw JSON export, or a Word-compatible RTF outline.
- An **expanded JavaScript file** you can run in the browser console or adapt as needed.

---

## Endpoint & Paging

- **Endpoint:** `GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true`
- **Recursive:** Set `recursive=true` to retrieve *all* descendants of the node.
- **Paging:** The API returns results with a `paging.nextPage` link. The script follows this link until completion.  
  Reference: Example usage of IH endpoints (Get Node Children) is shown in public Postman docs/workspaces. See: [Get Node Children](https://www.postman.com/insead-apis/higher-ed-rest-apis/request/fgxfzq1/blackboard-get-node-children).

---

## Output Formats

When you run the bookmarklet, a prompt lets you choose the export format:

> **Choose export format:**
> 1 = Pipe-delimited snapshot (.txt)
> 2 = JSON (raw REST response)
> 3 = RTF outline for Word (.rtf)

Entering anything other than `1`, `2`, or `3` (or cancelling the prompt) aborts the export with no file downloaded. There is no further prompt after this — the export runs immediately.

### Pipe-delimited snapshot (.txt)

The downloaded file (`IH-nodes-export-<hostname>-<date>.txt`) is **pipe-delimited** (no quotes):

```
parent_node_key|external_node_key|name|description
```

**Column descriptions:**

| Column | Description |
|---|---|
| `parent_node_key` | Parent node's `externalId` (blank if parent is not readable or has no `externalId`) |
| `external_node_key` | Child node's `externalId` |
| `name` | Child node's `title` |
| `description` | Child node's `description` |

### JSON (.json)

Produces `IH-nodes-export-<hostname>-<date>.json` — the flat array of node objects exactly as returned by the REST API's combined `results` pages, with no restructuring or field filtering. Useful if you want to script further processing (e.g. build your own tree, filter by attribute) without re-fetching. Every object includes the REST `id` field (`_nnn_1` format) as-is.

### Word-compatible outline (.rtf)

Instead of a flat file, this produces `IH-nodes-export-<hostname>-<date>.rtf` — a Rich Text Format document that opens directly in Microsoft Word (or Word Online/LibreOffice Writer). Each node is written as a heading-level paragraph matching its depth in the hierarchy (Heading 1 for top-level nodes, Heading 2 for their children, and so on), so:

- **View → Outline** in Word shows the full hierarchy and lets you promote, demote, and collapse/expand branches.
- Node descriptions (if present) appear as italicized body text nested under their node.

Hierarchies deeper than 9 levels are capped at Heading 9 for the deepest nodes (Word supports outline levels 0–8 / Heading 1–9). The RTF output does not currently include the node's internal id — see **Pending spec** below.

---

## Node id (`_nnn_1`) and Ally role IDs

The internal node id is no longer offered as a column/toggle in the pipe-delimited or RTF outputs — if you need it, use the **JSON** format, where every node object already includes its REST `id` field (e.g. `_957_1`).

Ally Departmental Reports require an Institutional Role ID per department node in the format `ALLY_NODE_957_1`, where `957` is the PK1 of the node. You can derive this from the JSON export's `id` field for each node (e.g. in a spreadsheet, after flattening the JSON: `="ALLY_NODE_" & MID(id,2,LEN(id)-2)`).

See the [Blackboard Ally departmental reports documentation](https://help.anthology.com/ally-lms/en/administrators/ally-institution-report/institution-report-directory/configure-blackboard-departmental-reports.html) for context.

---

## Filenames

Every export filename starts with `IH-nodes-export-` and includes the Blackboard site hostname and today's date, so files from different environments or runs don't collide, e.g.:

```
IH-nodes-export-mysite.blackboard.com-2026-07-24.txt
IH-nodes-export-mysite.blackboard.com-2026-07-24.json
IH-nodes-export-mysite.blackboard.com-2026-07-24.rtf
```

---

## Known Limitations & Notes

- **Special characters:** Values are not quoted. Any `|` characters or newlines inside `title`/`description` will appear as-is. If needed, add normalization (e.g., replace `|` with `❘`, trim newlines).
- **Large hierarchies:** The script follows `paging.nextPage` and applies a small delay (`sleep(50ms)`) to be polite. Increase the delay if you encounter throttling.
- **Auth:** Relies on existing session cookies (`credentials: 'include'`). If your Learn site enforces OAuth for REST, calls will fail with 401/403. In that case, obtain an OAuth token first and pass it via Authorization header. See: [Basic Authentication with REST](https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication).
- **TODO — needs more testing:** The `.rtf` outline export is new and has only been checked by hand-verifying the RTF control words/brace structure (this sandbox's LibreOffice couldn't load any RTF file to test automatically). Still needs a real open/verify pass in Microsoft Word — outline levels, promote/demote, deep hierarchies (10+ levels), and non-ASCII names/descriptions — before treating it as fully validated.
- **Pending spec:** The RTF outline format is still awaiting a final spec from terry@terrypatterson.net; the current implementation may change once that's received.