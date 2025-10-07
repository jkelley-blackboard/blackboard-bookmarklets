# Bookmarklet Development & Distribution Guidance

**Purpose:** Provide consistent practices for building, maintaining, and distributing all bookmarklets in this repository.

---

## 1. Repository Structure & Naming

Each bookmarklet tool lives in its own folder:

```
(tool_name)/
   (tool_name).js           # Expanded source (source of truth)
   (tool_name).min.bk.js    # Minified one-liner for bookmark URL
   README.md                # Tool-specific usage instructions
```

---

## 2. Best Practices for Code & UI

- **Expanded source**:
  - Readable, commented, and auditable.
  - Keep inline CSS **single-line** to avoid breaking minified bookmarklets.
  - Use minimal UI: plain buttons, small floating panel.
  - Escape user-supplied text before injecting into `innerHTML`.

- **Quoting strategy**:
  - Avoid unescaped quotes inside JS strings.
  - If needed, escape (`\"` or `\'`) or use `&quot;` for HTML attributes.
  - Prevent syntax errors like `Unexpected identifier 'Liberation'` by ensuring font-family stacks or attributes don’t break string delimiters.

- **Raw characters**:
  - Use raw characters (⚠, …, `\n`) for clarity and compactness.
  - Avoid HTML entities unless required for parsing safety.

---

## 3. Minification Rules

- **Expanded version**:
  - Keep descriptive names and comments.
  - Single-line inline CSS.
  - Include error handling and validation.

- **Minified one-liner (`*.min.bk.js`)**:
  - Remove comments and extra whitespace.
  - Keep `javascript:(...)` prefix for bookmarklets.
  - Validate by pasting into DevTools Console before distribution.

---

## 4. URL Length Reality Check

- The old **2,000-character limit** is outdated. Modern browsers allow **tens of thousands of characters** in bookmarklets.
- Chrome, Edge, and Firefox handle large one-liners; iOS Safari may truncate very long URLs.
- Real blockers today: **CSP**, **iframe isolation**, or **policy blocking `javascript:`**, not length.

---

## 5. Error Handling

- **Page checks**:
  - Not on expected page → “Go to the correct page…”
  - Missing required state (e.g., pagination) → “Show All is required…”

- **JSON ingestion**:
  - Parse errors → “JSON parse error: …”
  - Missing keys → “Invalid JSON: missing required fields.”

- **DOM changes**:
  - If selectors fail, show a clear alert and log details to console.

---

## 6. DOM Data Extraction (Generic Example)

When extracting data from the page, use a **priority-based approach**:

```javascript
function getKeyFromRow(tr) {
  // 1) Primary source (e.g., checkbox value)
  const cb = tr.querySelector('input[type="checkbox"]');
  if (cb && cb.value) return cb.value;

  // 2) Data attributes
  const attr = tr.getAttribute('data-key') || tr.dataset.key;
  if (attr) return attr;

  // 3) Fallback: text content or ID pattern
  const text = (tr.querySelector('th')?.innerText || '').trim();
  return text || null;
}
```

Adapt this logic per tool requirements.

---

## 7. Distribution

- **Preferred:** A single **self-contained one-liner** (`*.min.bk.js`) pasted into a bookmark’s URL field.
- **No external loader**: Avoid cross-origin fetch due to CSP and policy restrictions.
- Keep the expanded source in the repo for auditing and maintenance.

---

## 8. Testing Checklist

1. Navigate to the correct page and ensure required state (e.g., **Show All**).
2. Run the bookmarklet → Panel appears.
3. Verify:
   - Buttons perform expected actions.
   - Data extraction works (e.g., keys, names).
   - Downloaded JSON matches schema.
   - Upload/compare logic flags mismatches correctly.
4. Filters and UI controls behave as documented.

---

## 9. Troubleshooting

- **Syntax errors** → Check for unescaped quotes in inline CSS or HTML strings.
- **No data extracted** → Inspect DOM; update selectors or fallback logic.
- **Bookmarklet won’t run** → Check for CSP or `javascript:` blocking.
- **Very long one-liner** → Modern browsers allow it; if issues persist, test in DevTools Console.

