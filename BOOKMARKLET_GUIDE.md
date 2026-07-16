# Bookmarklet Development & Distribution Guidance

**Purpose:** Supplementary practices for building, maintaining, and distributing bookmarklets in this repository, beyond what's already covered in [CLAUDE.md](CLAUDE.md) (file structure, naming, code patterns) and [SHARED_FUNCTIONS.md](SHARED_FUNCTIONS.md) (reusable helpers).

---

## 1. Quoting & Raw Characters

- Avoid unescaped quotes inside JS strings; escape (`\"` or `\'`) or use `&quot;` for HTML attributes.
- Watch for font-family stacks or attributes that break string delimiters (e.g. `Unexpected identifier 'Liberation'` from an unescaped quoted font name).
- Prefer raw characters (⚠, …, `\n`) over HTML entities for clarity and compactness, except where entity-escaping is required for safety (see `esc()` in SHARED_FUNCTIONS.md).

---

## 2. Minification

- Validate every `.min.bk.js` by pasting it into DevTools Console before distribution — a passing build isn't proof it still runs.

---

## 3. URL Length Reality Check

- The old 2,000-character limit is outdated. Modern browsers allow tens of thousands of characters in a `javascript:` bookmarklet.
- Chrome, Edge, and Firefox handle large one-liners; iOS Safari may truncate very long URLs.
- Real blockers today: **CSP**, **iframe isolation**, or policy blocking `javascript:` — not length.

---

## 4. Error Handling Beyond the Page Guard

In addition to the page-guard pattern in CLAUDE.md, handle:

- **JSON ingestion**: parse errors → `"JSON parse error: …"`; missing keys → `"Invalid JSON: missing required fields."`
- **Missing required page state** (e.g., pagination not set to "Show All") → tell the user what to change, not just that something failed.
- **DOM selector failures**: show a clear `alert()` and `console.error()` the details — selectors are the most likely thing to break after a Blackboard update.

---

## 5. Distribution

- No external loader — avoid cross-origin fetch of the bookmarklet's own code, since CSP and org policy commonly block it. Ship the self-contained one-liner.

---

## 6. Testing Checklist

1. Navigate to the correct page and ensure required state (e.g., **Show All**).
2. Run the bookmarklet → panel appears.
3. Verify: buttons perform expected actions, data extraction works (keys, names), downloaded JSON matches schema, upload/compare logic flags mismatches correctly.
4. Filters and UI controls behave as documented.

---

## 7. Troubleshooting

- **Syntax errors** → check for unescaped quotes in inline CSS or HTML strings.
- **No data extracted** → inspect the DOM; update selectors or fallback logic.
- **Bookmarklet won't run** → check for CSP or `javascript:` blocking.
- **Very long one-liner** → modern browsers allow it; if issues persist, test in DevTools Console.
