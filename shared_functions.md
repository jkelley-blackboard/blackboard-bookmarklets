# Shared Functions for Blackboard Bookmarklets

Reusable helper functions for working with Blackboard pages, frames, and HTML safely.
These are lightweight utilities commonly embedded into bookmarklets.
All functions are designed to avoid namespace collisions and external dependencies.

---

## 1. esc(s)

**Purpose:** Escape HTML special characters for safe display in injected elements or logs.

**Parameters:**

* `s` *(string)* — The string to escape.

**Returns:** Escaped string with `&`, `<`, `>`, and `"` converted to their HTML entities.

**Example usage:**

```js
const safeHTML = esc(userInput);
```

**Notes:**
Use when inserting arbitrary text into the DOM to prevent malformed HTML or cross-site scripting (XSS) risks.

**Code:**

```js
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
```

---

## 2. getAdminFrameDocument()

**Purpose:** Retrieve the Blackboard Admin Panel’s main iframe and its document object. Blackboard Original experience pages (like admin page) run in a frameset inside the Ultra experience UI.  We need this code to work in the framed page.

**Returns:**
An object `{ frame, doc }` where:

* `frame` is the `<iframe>` element named `"bb-base-admin-iframe"`.
* `doc` is the inner `contentDocument` or `null` if unavailable.

**Example usage:**

```js
const { frame, doc } = getAdminFrameDocument();
if (!doc) alert("Admin frame not found");
```

**Notes:**
Use this in bookmarklets that interact with the admin interface — for example, plugin management or system tools.

**Code:**

```js
const getAdminFrameDocument = () => {
  const f = document.querySelector('iframe[name="bb-base-admin-iframe"]');
  return { frame: f, doc: f?.contentDocument ?? null };
};
```

---

## 3. isCorrectPage(doc)

**Purpose:** Check if a given framed document corresponds to a specific Blackboard admin page.

**Parameters:**

* `doc` *(Document)* — Document object, usually from `getAdminFrameDocument()`.

**Returns:** `true` if the page matches the expected path, else `false`.

**Example usage:**

```js
if (!isCorrectPage(doc)) alert("Please run this on the Installed Tools page.");
```

**Notes:**
This function’s internal check should be customized per bookmarklet.
Example for the Installed Tools page:

```js
const isCorrectPage = doc => doc?.location.pathname.includes('/webapps/plugins/execute/plugInController');
```

Other variations might check paths such as:

* `/webapps/blackboard/execute/courseManager`
* `/webapps/gradebook/do/instructor`

---

## 4. isShowAll(doc)

**Purpose:** Detect if “Show All” mode is active on a paginated Blackboard admin listing.

**Parameters:**

* `doc` *(Document)* — Target document (usually from admin iframe).

**Returns:** `true` if `showAll=true` appears in the URL query string.

**Example usage:**

```js
if (!isShowAll(doc)) alert("Enable Show All before running this script.");
```

**Code:**

```js
const isShowAll = doc => new URLSearchParams(doc.location.search).get('showAll') === 'true';
```
---
## 5. getPageContext(doc)

**Purpose:** Retrieve system and environment context for the current Blackboard page, including Learn version information via REST API.

**Parameters:**

- `doc` *(Document)* — The document object for the current page or iframe.

**Returns:** An async object containing:

- `host` *(string)* — The host domain.
- `bbVersion` *(string)* — Blackboard LMS version (e.g., `3900.91.0-rel.21+f6adf77`).
- `timestamp` *(string)* — ISO timestamp when retrieved.

**Example usage:**

```js
const context = await getPageContext(doc);
console.log(context.bbVersion);
```

**Notes:**\
This function is designed to be extensible — additional fields (e.g., user ID, course ID) can be added as needed for different bookmarklets.
The REST method for getting the system version turned out to be the most reliable. 
Some older bookmarklets may use a different method until I can get them all updated

**Code:**

```js
const getPageContext = async (doc) => {
  const host = doc.location.host || '';
  const timestamp = new Date().toISOString();
  const apiUrl = `${doc.location.origin}/learn/api/public/v1/system/version`;
  let bbVersion;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    bbVersion = `${data.learn.major}.${data.learn.minor}.${data.learn.patch}-${data.learn.build}`;
  } catch {
    bbVersion = 'Unavailable';
  }
  return { host, bbVersion, timestamp };
};
```
---
## 6. Floating Panel and Buttons

**Purpose:** Provide a reusable, consistent floating UI panel for displaying information, status summaries, and interactive buttons within Blackboard pages.

The panel takes its colors, font, and shadow from the Ultra theme (see 6.1), so it looks native to Blackboard LMS without depending on Ultra's build-generated class names.

---

### 6.1 getUltraTheme(doc)

**Purpose:** Read the Ultra theme's design tokens so bookmarklet UI matches the page.

Ultra is built on MUI and publishes its theme as CSS custom properties (`--palette-*`, `--shadows-*`) on the top page's `:root`. Original-experience pages inside the admin iframe don't have them, so the values are read from `window.top` and resolved to plain values, which work in any document. Every token has a fallback (Ultra's default theme), so a renamed or missing token degrades to today's look instead of breaking.

**Parameters:**

- `doc` *(Document)* — The document the panel will live in (fallback source if `window.top` can't be read).

**Returns:** An object of resolved CSS values: `text`, `muted`, `bg`, `paper`, `divider`, `primary`, `primaryHover`, `onPrimary`, `link`, `linkHover`, `focus`, `success`, `warning`, `error`, `shadow`.

**Notes:**

- The institution's custom theme color (`--bb-theme-primary-color`) only exists inside the theme editor's preview, so it isn't available here.
- Values containing `;`, `{`, `}`, `<` or `>` are rejected in favor of the fallback, since they're written into a style attribute.

**Code:**

```js
const getUltraTheme = doc => {
  let cs = null;
  try { cs = window.top.getComputedStyle(window.top.document.documentElement); } catch (e) { /* cross-origin top */ }
  cs = cs || doc.defaultView.getComputedStyle(doc.documentElement);
  const tok = (name, fallback) => {
    const v = cs.getPropertyValue(`--${name}`).trim();
    return v && !/[;{}<>]/.test(v) ? v : fallback;
  };
  return {
    text: tok('palette-text-primary', '#262626'),
    muted: tok('palette-text-secondary', '#666666'),
    bg: tok('palette-background-default', '#ffffff'),
    paper: tok('palette-background-paper', '#f8f8f8'),
    divider: tok('palette-divider', 'rgba(0,0,0,.12)'),
    primary: tok('palette-primary-main', '#262626'),
    primaryHover: tok('palette-primary-light', '#404040'),
    onPrimary: tok('palette-primary-contrastText', '#ffffff'),
    link: tok('palette-link-active', '#2073a1'),
    linkHover: tok('palette-link-hover', '#004270'),
    focus: tok('palette-focus-main', '#006dc7'),
    success: tok('palette-success-main', '#007d2c'),
    warning: tok('palette-warning-dark', 'rgb(142,125,0)'),
    error: tok('palette-error-main', '#c23e37'),
    shadow: tok('shadows-8', '0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12)')
  };
};
```

---

### 6.2 ensurePanel(doc, options)

**Purpose:** Create or reset a floating control panel on the page.  
If an existing panel with the same ID is found, it resets its content; otherwise, it builds a new one, themed with `getUltraTheme()`.

**Parameters:**

- `doc` *(Document)* — The target document (main or iframe).  
- `options` *(object, optional)* — Configuration options:
  - `title` *(string)* — Panel title (default: `"Bookmarklet Panel"`).
  - `id` *(string)* — DOM ID for the panel (default: `"cmpPanel"`).

**Returns:** The panel element, containing `#pageContextTop` (context box), `#buttonRowPrimary` (button row) and `#summary` (status line).

**Theme variables:** each token is set on the panel as `--bbp-<token>` (for example `--bbp-muted`, `--bbp-success`), so tool markup can use `style="color:var(--bbp-error)"` without hard-coding colors.

**Helper classes** (scoped to the panel):

| Class | Use |
|-------|-----|
| `cmp-btn` | Primary (filled) button; `addBtn()` applies it |
| `cmp-btn-outline` | Add to `cmp-btn` for a secondary (outlined) button |
| `cmp-btn-sm` | Add to `cmp-btn` for a compact button inside a list row |
| `cmp-link` | Ultra-style link |
| `cmp-card` | Bordered row/card for list items |
| `cmp-muted` | Secondary text, 12px |
| `cmp-mono` | Monospace, 11px (URLs, IDs) |
| `cmp-srcline` | Wraps long lines |

**Example usage:**
```js
const panel = ensurePanel(doc, { title: 'Course Sync Utility' });
const btnRow = panel.querySelector('#buttonRowPrimary');
addBtn(doc, btnRow, 'Run Sync', () => alert('Running...'));
panel.insertAdjacentHTML('beforeend', `<div class="cmp-card"><b>${esc(name)}</b> <span class="cmp-muted">${esc(id)}</span></div>`);
```

**Code:**
```js
const ensurePanel = (doc, options = {}) => {
  const panelId = options.id || 'cmpPanel';
  let panel = doc.getElementById(panelId);
  if (panel) {
    const top = panel.querySelector('#pageContextTop');
    const summary = panel.querySelector('#summary');
    if (top) top.innerHTML = '';
    if (summary) summary.textContent = '';
    return panel;
  }
  panel = doc.createElement('div');
  panel.id = panelId;
  // Theme tokens become --bbp-* properties on the panel, so tool markup can use var(--bbp-muted) etc.
  const vars = Object.entries(getUltraTheme(doc)).map(([k, v]) => `--bbp-${k}:${v}`).join(';');
  panel.style.cssText = `${vars};position:fixed;top:20px;left:20px;z-index:2147483647;background:var(--bbp-bg);color:var(--bbp-text);border:1px solid var(--bbp-divider);border-radius:8px;padding:16px;min-width:380px;max-width:min(960px,94vw);max-height:72vh;overflow:auto;box-shadow:var(--bbp-shadow);font:14px/1.43 'Open Sans',sans-serif;text-align:left`;
  const title = options.title || 'Bookmarklet Panel';
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px"><span style="font-weight:600;font-size:16px">${esc(title)}</span><button id="${panelId}-close" class="cmp-close" aria-label="Close">✕</button></div><div id="pageContextTop" style="border:1px solid var(--bbp-divider);background:var(--bbp-paper);padding:8px 12px;border-radius:4px;margin:8px 0;max-height:120px;overflow:auto;font-size:13px"></div><div id="buttonRowPrimary" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"></div><div id="summary" style="margin-top:8px;font-weight:600"></div>`;
  const p = `#${panelId}`;
  const style = doc.createElement('style');
  style.textContent = [
    `${p},${p} *{box-sizing:border-box}`,
    `${p} button{font:inherit}`,
    `${p} button.cmp-btn{margin:0;padding:6px 12px;font-weight:600;line-height:1.43;border-radius:4px;border:1px solid var(--bbp-primary);background:var(--bbp-primary);color:var(--bbp-onPrimary);cursor:pointer}`,
    `${p} button.cmp-btn:hover:not(:disabled){background:var(--bbp-primaryHover)}`,
    `${p} button.cmp-btn-outline{background:transparent;color:var(--bbp-primary)}`,
    `${p} button.cmp-btn-outline:hover:not(:disabled){background:var(--bbp-paper)}`,
    `${p} button.cmp-btn-sm{padding:2px 8px;font-size:12px}`,
    `${p} button:disabled{opacity:.5;cursor:default}`,
    `${p} :focus-visible{outline:2px solid var(--bbp-focus);outline-offset:2px}`,
    `${p} .cmp-close{background:none;border:0;border-radius:4px;padding:4px 8px;font-size:16px;line-height:1;color:var(--bbp-muted);cursor:pointer}`,
    `${p} .cmp-close:hover{background:var(--bbp-paper);color:var(--bbp-text)}`,
    `${p} a.cmp-link{color:var(--bbp-link);font-weight:600;text-decoration:underline;margin-right:12px}`,
    `${p} a.cmp-link:hover{color:var(--bbp-linkHover)}`,
    `${p} .cmp-card{border:1px solid var(--bbp-divider);background:var(--bbp-bg);border-radius:4px;padding:8px 12px;margin:8px 0}`,
    `${p} .cmp-muted{color:var(--bbp-muted);font-size:12px}`,
    `${p} .cmp-mono{font-family:ui-monospace,Consolas,monospace;font-size:11px}`,
    `${p} .cmp-srcline{white-space:pre-wrap;word-break:break-word}`
  ].join('');
  panel.appendChild(style);
  doc.body.appendChild(panel);
  panel.querySelector(`#${panelId}-close`).onclick = () => panel.remove();
  panel.style.left = (doc.defaultView.innerWidth - panel.offsetWidth) / 2 + 'px';
  return panel;
};
```

**Notes:**

- Requires `esc()` (section 1) and `getUltraTheme()` (section 6.1).
- Each CSS rule is a single-line string, so minification can't break it.
- Older bookmarklets still embed the previous yellow/purple version of this helper; they'll be moved to this one over time.

---

### 6.3 addBtn(doc, wrap, label, fn, id)

**Purpose:** Add a styled button to a specified container in the floating panel.

**Parameters:**
- `doc` *(Document)* — The document containing the panel.
- `wrap` *(Element)* — The parent element to append the button to.
- `label` *(string)* — Button text.
- `fn` *(Function)* — Click handler function.
- `id` *(string, optional)* — Button ID (optional).

**Returns:** The created button element.

**Example usage:**
```js
const btnRow = panel.querySelector('#buttonRowPrimary');
addBtn(doc, btnRow, 'Export', exportData, 'exportBtn');
```

**Code:**
```js
const addBtn = (doc, wrap, label, fn, id) => {
  const btn = doc.createElement('button');
  btn.textContent = label;
  if (id) btn.id = id;
  btn.className = 'cmp-btn';
  btn.onclick = fn;
  wrap.appendChild(btn);
  return btn;
};
```


**Notes:**
- Use `ensurePanel()` once per bookmarklet to manage layout.
- Use `addBtn()` for command buttons or contextual actions.
- You can easily extend the panel with custom sections (e.g., logs, tables, progress bars).

---

---

### 🧩 Notes

* These functions are safe to include inline in bookmarklets or loaded dynamically from a shared source file.
* To prevent name collisions, you may prefix them in production builds (e.g., `bbEsc`, `bbGetFrame`).
* Additional helpers can be grouped by domain (UI, DOM, API, Blackboard-specific).
