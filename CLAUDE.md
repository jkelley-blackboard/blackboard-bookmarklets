# blackboard-bookmarklets — Claude Code Context

This repo is a collection of JavaScript bookmarklets for **Blackboard LMS** (Ultra/SaaS) administrators.
Live docs page: https://jkelley-blackboard.github.io/blackboard-bookmarklets

Related reference docs, loaded automatically as part of this context:
@SHARED_FUNCTIONS.md
@BOOKMARKLET_GUIDE.md

---

## Naming — STRICT RULES

| Term | Always use | Never use |
|------|-----------|-----------|
| Company | **Blackboard** | Anthology, Anthology Blackboard |
| Platform | **Blackboard LMS** | Anthology Learn, Blackboard Learn (in new content) |

Apply to: source files, READMEs, comments, `bookmarklets.json`, all new and updated content.

---

## Three-file pattern — every bookmarklet needs all three

```
<tool_name>/
├── <tool_name>_bookmarklet.js          # Readable annotated source (source of truth)
├── <tool_name>_bookmarklet.min.bk.js   # Minified single-line, starts with javascript:
└── README.md                           # Docs following required section order
```

Registry: `docs/bookmarklets.json` — must be updated for every new or renamed tool.

---

## Source file rules (`_bookmarklet.js`)

- IIFE wrapper always: `(function () { 'use strict'; ... })();`
- 2-space indentation
- ES6+: `const`/`let`, arrow functions, template literals, `?.`, `??`
- No external dependencies — no CDN, no jQuery, no frameworks
- Inline CSS must be **single-line** (multi-line breaks minification)
- Section comments: `// ── Section Name ──────────────────────────────────────`
- File header block:
  ```javascript
  /**
   * Tool Name
   *
   * Description: One paragraph.
   * Usage: Which Blackboard page, then what to do.
   * APIs/Pages: e.g. /learn/api/public/v1/courses
   * Author: Jeff Kelley / Blackboard Solutions Engineering
   */
  ```

---

## Key code patterns

**Page guard** (always first):
```javascript
if (!document.querySelector('.some-bb-selector')) {
  alert('⚠ Please navigate to the correct Blackboard LMS page first.');
  return;
}
```

**Sanitize before innerHTML** and **floating panel**: use the canonical `esc()` / `ensurePanel()` / `addBtn()` helpers in [SHARED_FUNCTIONS.md](SHARED_FUNCTIONS.md) — don't hand-roll a new version of either.

**Admin-frame pages** (Original-experience admin pages run in an iframe inside the Ultra UI): use `getAdminFrameDocument()` / `isCorrectPage()` / `isShowAll()` from [SHARED_FUNCTIONS.md](SHARED_FUNCTIONS.md).

**Download**:
```javascript
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
```

**DOM extraction** (priority-based):
```javascript
function getKeyFromRow(tr) {
  const cb = tr.querySelector('input[type="checkbox"]');
  if (cb?.value) return cb.value;
  const attr = tr.getAttribute('data-key') || tr.dataset.key;
  if (attr) return attr;
  return (tr.querySelector('th')?.innerText || '').trim() || null;
}
```

---

## Minified file rules (`_bookmarklet.min.bk.js`)

- Single line, no comments, no extra whitespace
- Must start with `javascript:`
- Functionally identical to the source file
- Use terser to produce: `terser <source>.js --compress --mangle`, then prepend `javascript:`

---

## README required section order

1. H1 title
2. One-paragraph description (generic Blackboard LMS language — no client/institution names)
3. `---`
4. `## Features` (bullet list)
5. `---`
6. `## Installation` (3 steps pointing to the live docs page)
7. `---`
8. `## Usage` (numbered steps + `### Notes & Troubleshooting` subsection)
9. `---`
10. `## File Structure` (fenced tree)
11. `---`
12. `## Development / Implementation Notes`
13. `---`
14. `## Security & Disclaimer` (see standard text below)
15. `---`

**Standard disclaimer**:
> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---

## `docs/bookmarklets.json` entry format

```json
{
  "label": "Bb Tool Display Name",
  "description": "Active-voice one sentence, no trailing period",
  "path": "tool_name/tool_name_bookmarklet.min.bk.js",
  "category": "Extractors",
  "lastUpdated": "YYYY-MM-DD"
}
```

**Label** always starts with `"Bb "`.
**Category** must be one of exactly: `Role Managers` · `Enhanced Display` · `Extractors` · `Gradebook Tools` · `Other Tools`
**lastUpdated** is a manually-maintained date (`YYYY-MM-DD`) shown on the docs site card — bump it whenever the tool's `.min.bk.js` changes.

---

## Folder & file naming

- Folder: `snake_case`, descriptive of function, no version numbers
- Source: `<folder>_bookmarklet.js`
- Minified: `<folder>_bookmarklet.min.bk.js`
- Docs: `README.md`

---

## License notice — standard text

Use this exact wording everywhere a license statement appears (LICENSE file, README `## License` sections, footer lines). Do **not** use "MIT", copyright years, or any other license name.

> This software is provided as-is, without warranty or support of any kind. Blackboard retains all rights. Use at your own risk.

The `LICENSE` file at the repo root is the canonical copy. READMEs may include the statement inline or link to it with "See [LICENSE](../LICENSE) for details."

---

## Safety rules

- No external HTTP calls with user data
- No `localStorage` for sensitive data
- No data exfiltration of any kind
- Always show `alert()` for user-facing errors; `console.error()` for debug detail
- Never reference specific institutions or client names in any file

---

## Existing tools (for reference before creating something new)

| Folder | Category | What it does |
|--------|----------|-------------|
| `b2_compare` | Other Tools | Compares Building Block configurations |
| `bb_test_extractor` | Extractors | Extracts test/assessment data |
| `course_details` | Enhanced Display | Displays course metadata |
| `dev_filters` | Enhanced Display | Adds developer-oriented filters |
| `display_entitlements` | Role Managers | Shows user entitlements |
| `getOtherNames` | Extractors | Retrieves alternate user name records |
| `institutionalHierarchy_export` | Extractors | Exports institutional hierarchy data |
| `lti_placements` | Enhanced Display | Shows LTI tool placement details |
| `orphan_grades` | Gradebook Tools | Identifies orphaned grade entries |
| `role_compare` | Role Managers | Compares privilege sets between roles |
| `role_download` | Role Managers | Downloads role privilege lists |
| `role_privliges_utility` | Role Managers | Utility for role privilege management |
| `ultra_roster` | Extractors | Extracts course roster data |
| `user_details` | Enhanced Display | Displays user account details |
| `uuid_lookup` | Other Tools | Looks up UUIDs for Blackboard objects |
| `view_analytics_ids` | Enhanced Display | Surfaces analytics identifiers on page |
