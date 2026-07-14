# Blackboard Learn Institutional Hierarchy Children Export (Bookmarklet & Script)

Exports all **descendant nodes** of a given Institutional Hierarchy node from Blackboard Learn using the REST API endpoint:

```
GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
```

This repository provides:

- A **one-line bookmarklet** you can save in your browser to download a pipe-delimited text file.
- An **expanded JavaScript file** you can run in the browser console or adapt as needed.

---

## Endpoint & Paging

- **Endpoint:** `GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true`
- **Recursive:** Set `recursive=true` to retrieve *all* descendants of the node.
- **Paging:** The API returns results with a `paging.nextPage` link. The script follows this link until completion.  
  Reference: Example usage of IH endpoints (Get Node Children) is shown in public Postman docs/workspaces. See: [Get Node Children](https://www.postman.com/insead-apis/higher-ed-rest-apis/request/fgxfzq1/blackboard-get-node-children).

---

## Output Formats

When you run the bookmarklet, a confirmation dialog lets you choose the export format:

> **Export format?**
> OK = Word-compatible outline (.rtf) — nested headings you can open, promote/demote, and print in Microsoft Word
> Cancel = Pipe-delimited snapshot (.txt)

### Pipe-delimited snapshot (.txt)

The downloaded file is **pipe-delimited** (no quotes).

#### Standard output (default)

```
parent_node_key|external_node_key|name|description
```

#### With node_id column (optional — see below)

```
parent_node_key|external_node_key|name|description|node_id
```

**Column descriptions:**

| Column | Description |
|---|---|
| `parent_node_key` | Parent node's `externalId` (blank if parent is not readable or has no `externalId`) |
| `external_node_key` | Child node's `externalId` |
| `name` | Child node's `title` |
| `description` | Child node's `description` |
| `node_id` | Child node's internal PK ID in `_nnn_1` format (optional — see below) |

### Word-compatible outline (.rtf)

Instead of a flat file, this produces `ih-outline-_1_1.rtf` — a Rich Text Format document that opens directly in Microsoft Word (or Word Online/LibreOffice Writer). Each node is written as a heading-level paragraph matching its depth in the hierarchy (Heading 1 for top-level nodes, Heading 2 for their children, and so on), so:

- **View → Outline** in Word shows the full hierarchy and lets you promote, demote, and collapse/expand branches.
- Node descriptions (if present) appear as italicized body text nested under their node.
- If you opted in to `node_id`, it's appended after each node's name, e.g. `College of Engineering [_312_1]`.

Hierarchies deeper than 9 levels are capped at Heading 9 for the deepest nodes (Word supports outline levels 0–8 / Heading 1–9).

---

## Optional: Include node_id

Before the format prompt, a confirmation dialog will appear:

> **Include node_id (_nnn_1 format)?**  
> Useful for building ALLY_NODE_ institutional role IDs.  
> OK = Yes, include node_id | Cancel = Standard export (no node_id)

The `node_id` value (e.g. `_957_1`) is the node's internal primary key as returned directly by the REST API. No additional fetch is required — it is already present in the children response. This choice applies to both output formats: it adds a `node_id` column in the `.txt` export, or a `[_957_1]` suffix on each node's name in the `.rtf` outline.

### Why you might want node_id

Ally Departmental Reports require an Institutional Role ID per department node in the format `ALLY_NODE_957_1`, where `957` is the PK1 of the node. Including the `node_id` column gives you this value in `_957_1` format for every node in a single export, making it straightforward to construct the role IDs (e.g. in Excel using `="ALLY_NODE_" & MID(E2,2,LEN(E2)-2)`).

See the [Blackboard Ally departmental reports documentation](https://help.anthology.com/ally-lms/en/administrators/ally-institution-report/institution-report-directory/configure-blackboard-departmental-reports.html) for context.

### Sample output with node_id

```
parent_node_key|external_node_key|name|description|node_id
UAF|UAF_ENGR|College of Engineering||_312_1
UAF_ENGR|UAF_ENGR_EECS|Electrical Engineering and Computer Science (EECS)||_957_1
UAF_ENGR|UAF_ENGR_MEEG|Mechanical Engineering (MEEG)||_958_1
```

---

## Known Limitations & Notes

- **Special characters:** Values are not quoted. Any `|` characters or newlines inside `title`/`description` will appear as-is. If needed, add normalization (e.g., replace `|` with `❘`, trim newlines).
- **Large hierarchies:** The script follows `paging.nextPage` and applies a small delay (`sleep(50ms)`) to be polite. Increase the delay if you encounter throttling.
- **Auth:** Relies on existing session cookies (`credentials: 'include'`). If your Learn site enforces OAuth for REST, calls will fail with 401/403. In that case, obtain an OAuth token first and pass it via Authorization header. See: [Basic Authentication with REST](https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication).
- **TODO — needs more testing:** The `.rtf` outline export is new and has only been checked by hand-verifying the RTF control words/brace structure (this sandbox's LibreOffice couldn't load any RTF file to test automatically). Still needs a real open/verify pass in Microsoft Word — outline levels, promote/demote, deep hierarchies (10+ levels), and non-ASCII names/descriptions — before treating it as fully validated.