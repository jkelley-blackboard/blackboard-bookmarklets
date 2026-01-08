
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

## Output Format = Snapshot

The downloaded file is **pipe-delimited** (no quotes) with the header:

```
parent_node_key|external_node_key|name|description
```

Where:
- **parent_node_key**: Parent node's `externalId` (blank if parent is not readable or has no `externalId`).
- **external_node_key**: Child node's `externalId`.
- **name**: Child node's `title`.
- **description**: Child node's `description`.



## Known Limitations & Notes


- **Special characters:** Values are not quoted. Any `|` characters or newlines inside `title`/`description` will appear as-is. If needed, add normalization (e.g., replace `|` with `❘`, trim newlines).
- **Large hierarchies:** The script follows `paging.nextPage` and applies a small delay (`sleep(50ms)`) to be polite. Increase the delay if you encounter throttling.

---
