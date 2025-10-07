# Shared Functions for Blackboard Bookmarklets

Reusable helper functions for working with Blackboard pages, frames, and HTML safely.
These are lightweight utilities commonly embedded into bookmarklets.
All functions are designed to avoid namespace collisions and external dependencies.

---

## 1. esc(s)

**Purpose:** Escape HTML special characters for safe display in injected elements or logs.

**Parameters:**

* `s` *(string)* — The string to escape.

**Returns:** Escaped string with `&`, `<`, and `>` converted to their HTML entities.

**Example usage:**

```js
const safeHTML = esc(userInput);
```

**Notes:**
Use when inserting arbitrary text into the DOM to prevent malformed HTML or cross-site scripting (XSS) risks.

**Code:**

```js
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&', '<': '<', '>': '>' }[c]));
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
- `bbVersion` *(string)* — Blackboard Learn version (e.g., `3900.91.0-rel.21+f6adf77`).
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

This panel is ideal for bookmarklets that need a simple control interface or visual feedback without disrupting the Blackboard layout.

---

### 6.1 ensurePanel(doc, options)

**Purpose:** Create or reset a floating control panel on the page.  
If an existing panel with the same ID is found, it resets its content; otherwise, it builds a new one.

**Parameters:**

- `doc` *(Document)* — The target document (main or iframe).  
- `options` *(object, optional)* — Configuration options:
  - `title` *(string)* — Panel title (default: `"Bookmarklet Panel"`).
  - `id` *(string)* — DOM ID for the panel (default: `"cmpPanel"`).

**Returns:** The panel element.

**Example usage:**
```js
const panel = ensurePanel(doc, { title: 'Course Sync Utility' });
const btnRow = panel.querySelector('#buttonRowPrimary');
addBtn(doc, btnRow, 'Run Sync', () => alert('Running...'));
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
  panel.style.cssText = `
    position:fixed;
    top:20px;
    left:20px;
    z-index:2147483647;
    background:#fffbe6;
    border:3px solid #111;
    border-radius:8px;
    padding:12px;
    min-width:380px;
    max-height:72vh;
    overflow:auto;
    box-shadow:0 6px 18px rgba(0,0,0,.25);
    font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  `;

  const title = options.title || 'Bookmarklet Panel';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-weight:600">${title}</span>
      <button id="${panelId}-close" class="cmp-btn" style="background:#111;color:#fff;padding:2px 8px;border-radius:6px">✕</button>
    </div>
    <div id="pageContextTop" style="border:1px solid #e5e7eb;background:#fff;padding:6px;border-radius:6px;margin:6px 0;max-height:120px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;line-height:1.35"></div>
    <div id="buttonRowPrimary" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>
    <div id="summary" style="margin-top:6px;font-weight:500"></div>
  `;

  const style = doc.createElement('style');
  style.textContent = `
    #${panelId} .cmp-srcline {
      white-space:pre-wrap;
      word-break:break-word;
    }
    #${panelId} button.cmp-btn {
      margin:0;
      padding:6px 10px;
      font-size:13px;
      border-radius:6px;
      border:1px solid #5b21b6;
      background:#7c3aed;
      color:#fff;
      cursor:pointer;
      box-shadow:0 1px 2px rgba(0,0,0,.06);
    }
    #${panelId} button.cmp-btn:hover {
      filter:brightness(1.05);
    }
  `;
  panel.appendChild(style);
  doc.body.appendChild(panel);

  panel.querySelector(`#${panelId}-close`).onclick = () => panel.remove();

  panel.style.left = (doc.defaultView.innerWidth - panel.offsetWidth) / 2 + 'px';
  return panel;
};
```

---

### 6.2 addBtn(doc, wrap, label, fn, id)

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
