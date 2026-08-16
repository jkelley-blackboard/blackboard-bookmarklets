# Blackboard LMS Institutional Hierarchy Children Export (Bookmarklet & Script)

Exports all **descendant nodes** of a given Institutional Hierarchy node from Blackboard LMS using the REST API endpoint:

```
GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
```

This repository provides:

- A **one-line bookmarklet** you can save in your browser to download a pipe-delimited text file, a raw JSON export, or a Word-compatible `.docx` outline.
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
> 3 = Word outline (.docx)

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

### Word outline (.docx)

Instead of a flat file, this produces `IH-nodes-export-<hostname>-<date>.docx` — a real Word document (the bookmarklet builds the OOXML `.docx` package, including a ZIP container, entirely in-browser with no external libraries). Each node is written as one paragraph in a Word multilevel numbered list, with list depth matching the node's depth in the hierarchy, so opening the file in Word shows numbering like:

```
1.  University of St. Thomas | UST | University Parent Node
    a.  Academics | ACAD
        i.  College of Business | COB
            1.  Accounting | ACCT
            2.  Marketing | MRKT
        ii. College of Nursing | NURS
    b.  Assessment | ASSESS
```

Each line's text is `Name | ExternalId` followed by ` | Description` when a description is present (omitted entirely when blank) — no separate description paragraph. Numbering cycles decimal → lowercase letter → lowercase roman every 3 levels (matching Word's own default "1. a. i." multilevel list style), and hierarchies deeper than 9 levels are capped at the 9th (deepest) list level.

This format matches the input expected by Terry Patterson's [Institutional Hierarchy generator](https://blackboard.tools/ih-generator/), which parses a `.docx`/`.doc` outline back into a hierarchy (reconstructing `PARENT_NODE_KEY` from each line's list nesting depth) — verified directly against that tool's own sample `.docx` and by round-tripping a sample export through the live tool.

---

## Node id (`_nnn_1`) and Ally role IDs

The internal node id is no longer offered as a column/toggle in the pipe-delimited or `.docx` outputs — if you need it, use the **JSON** format, where every node object already includes its REST `id` field (e.g. `_957_1`).

Blackboard® Ally Departmental Reports require an Institutional Role ID per department node in the format `ALLY_NODE_957_1`, where `957` is the PK1 of the node. You can derive this from the JSON export's `id` field for each node (e.g. in a spreadsheet, after flattening the JSON: `="ALLY_NODE_" & MID(id,2,LEN(id)-2)`).

See the [Blackboard Ally departmental reports documentation](https://help.anthology.com/ally-lms/en/administrators/ally-institution-report/institution-report-directory/configure-blackboard-departmental-reports.html) for context.

---

## Filenames

Every export filename starts with `IH-nodes-export-` and includes the Blackboard site hostname and today's date, so files from different environments or runs don't collide, e.g.:

```
IH-nodes-export-mysite.blackboard.com-2026-07-24.txt
IH-nodes-export-mysite.blackboard.com-2026-07-24.json
IH-nodes-export-mysite.blackboard.com-2026-07-24.docx
```

---

## Known Limitations & Notes

- **Special characters:** Values are not quoted or escaped for the `|` delimiter in either the pipe-delimited `.txt` or the `.docx` outline — a literal `|` or newline inside `title`/`description` will appear as-is and can throw off column/field parsing on the receiving end (e.g. the ih-generator tool). If needed, add normalization (e.g., replace `|` with `❘`, trim newlines) before exporting.
- **Large hierarchies:** The script follows `paging.nextPage` and applies a small delay (`sleep(50ms)`) to be polite. Increase the delay if you encounter throttling.
- **Auth:** Relies on existing session cookies (`credentials: 'include'`). If your Learn site enforces OAuth for REST, calls will fail with 401/403. In that case, obtain an OAuth token first and pass it via Authorization header. See: [Basic Authentication with REST](https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication).
- **`.docx` export:** Verified by opening a generated file in real Microsoft Word (correct list numbering, promote/demote, nesting) and by confirming the OOXML list structure matches the ih-generator tool's own sample `.docx` byte-for-byte in shape (same `hybridMultilevel` numbering definition, same `ListParagraph` paragraph style).