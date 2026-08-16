# Bb CSS Selector Auditor

Scans a Blackboard LMS page's live stylesheets for CSS rules driven by custom-property toggles (e.g. `display: var(--hide-show)`) — the pattern used by test-mode hide/highlight custom CSS. For every selector found, runs it against the live DOM and reports match count, computed outline, computed display, and bounding-box size, so a custom CSS file's TEST-mode rules can be verified without manually inspecting each element in DevTools.

---

## Features

- Walks every accessible stylesheet on the page (including nested `@layer`/`@media` blocks) and collects every `CSSStyleRule` whose declarations reference a CSS custom property (`var(--...)`) — by default, ignoring the thousands of unrelated rules in Blackboard LMS's own stylesheets.
- Splits comma-separated selector lists (`a, b, c { ... }`) into individual selectors for per-selector results, while correctly keeping selectors like `:has(a, b)` intact.
- For each selector: match count, and for up to 8 matched elements — computed `outline`, computed `display`, and bounding-box width/height.
- Flags **collapsed** elements — non-`display:none` elements with a zero-size bounding box, the signature of a `revert`/`revert-layer` toggle rule falling through to the wrong default.
- Status icon per selector: 🟡 outlined (TEST mode active and rendering), 🚫 all matches hidden (`display:none`), ⚪ matches exist but none outlined, ⚠️ collapsed geometry detected, ➖ zero matches, ❌ invalid selector.
- Live text filter to narrow results by selector substring.
- "Include all CSS (slow)" checkbox to fall back to scanning every stylesheet rule, not just custom-property-driven ones.
- Shows the current computed value of any `--hide-show*`-named custom property on `:root`, so you always know whether a capture was taken in TEST or PRODUCTION mode.
- **Re-scan** button — re-run against the current DOM state without re-triggering the bookmarklet, useful after opening a menu/dialog whose contents only exist in the DOM while open.
- **Export JSON** — downloads the full result set (all selectors, all captured match detail) for sharing or archiving.

---

## Installation

1. Visit the [Blackboard Bookmarklets docs page](https://jkelley-blackboard.github.io/blackboard-bookmarklets).
2. Find **Bb CSS Selector Auditor** and click **Copy Bookmarklet**.
3. Create a new bookmark in your browser and paste the copied code as the URL.

---

## Usage

1. Navigate to any Blackboard LMS page where a custom CSS file using CSS-variable-driven toggle rules is loaded.
2. If you want to audit selectors that only render while something is open (a dropdown menu, a settings panel, a dialog), open it first.
3. Click the **Bb CSS Selector Auditor** bookmarklet — a panel appears with results for every toggle-driven selector found.
4. Use the filter box to narrow to a section you're testing, or check **include all CSS** to scan every stylesheet rule on the page (slower — Blackboard LMS's own stylesheets are large).
5. Click **Re-scan** after changing page state (opening a menu, navigating, etc.) without needing to re-run the bookmarklet from your bookmarks bar.
6. Click **Export JSON** to download the full result set.

### Notes & Troubleshooting

- A selector showing **0 matches** does not necessarily mean it's broken — it may mean the target element simply isn't in the DOM right now (e.g. a closed dropdown's menu items). Open the relevant UI first, then Re-scan.
- Only same-origin stylesheets can be inspected — cross-origin stylesheets (e.g. third-party font CSS) are skipped silently, which is expected and not an error.
- The "toggle-driven" default filter looks for any declaration containing `var(--`, not a specific variable name — it works with any custom-property-based toggle naming scheme, not just `--hide-show`.
- If a custom CSS file was just deployed or changed, the browser's stylesheet cache may lag — hard-refresh before auditing.

---

## File Structure

```
css_selector_auditor/
├── css_selector_auditor_bookmarklet.js         # Annotated source (source of truth)
├── css_selector_auditor_bookmarklet.min.bk.js  # Minified single-line bookmarklet
└── README.md
```

---

## Development / Implementation Notes

- **Selector splitting**: `splitTopLevelSelectors()` walks the selector string tracking paren/bracket depth so it only splits on top-level commas — `:has(a, b)` and `[data-x="a,b"]` are never incorrectly split.
- **Layer tracking**: while walking nested `CSSRule.cssRules`, the current `@layer` name is tracked via `rule.constructor.name === 'CSSLayerBlockRule'` and carried down into child rules, so results can show which layer a selector came from (useful when a page loads more than one custom stylesheet using layers).
- **Collapse detection**: an element is flagged `collapsed` when its computed `display` is not `none`/`contents` but its `getBoundingClientRect()` is `0×0` — this is the exact failure mode of a CSS toggle falling back to the browser's spec-initial `display` value instead of the site's own layout CSS (e.g. `revert` vs `revert-layer` on a `<li>` or MUI flex row).
- **No hardcoded selector list**: the tool reads whatever CSS is actually loaded on the page at scan time rather than shipping a fixed selector list, so it stays useful across any custom CSS file version without needing updates.
- **Performance**: the default `var(--` filter is a deliberate tradeoff — scanning every rule in Blackboard LMS's own stylesheet set (potentially thousands of rules) against a live SPA DOM via `querySelectorAll` would be slow and mostly noise. The "include all CSS" checkbox is available for cases where that's actually wanted.
- **CSS rules**: Inline panel/control CSS is kept on a single line in the source to simplify minification, per repo convention.

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
