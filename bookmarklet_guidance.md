# Bookmarklet Expansion & Minification Guidance

**Purpose:** Ensure bookmarklets are readable for development, maintainable, and safe to convert into one-line minified versions.

---

## 1. CSS / Style Strings

* Always single-line.
* Reason: multi-line template literals can break minified bookmarklets.
* Example:

```javascript
const buttonStyle = "margin:4px;padding:6px 12px;font-size:14px;border-radius:4px;border:1px solid #666;background:#f9f9f9;cursor:pointer;transition:all 0.2s;outline:none;";
const panelStyle = "position:fixed;top:20px;z-index:9999;background:#ffffcc;border:4px solid black;border-radius:6px;padding:12px;cursor:move;min-width:320px;overflow:auto;box-shadow:2px 2px 6px rgba(0,0,0,0.2);";
```

---

## 2. JavaScript Logic

* Keep expanded: indentation, descriptive variable names, and comments.
* Example:

```javascript
const addButton = (label, handler) => {
    const btn = doc.createElement("button");
    btn.textContent = label;
    btn.style = buttonStyle; // single-line CSS
    btn.onclick = handler;
    buttonContainer.appendChild(btn);
};
```

---

## 3. Functional Blocks

Separate code into clear sections for maintainability:

1. Access iframe / verify page
2. Create floating panel
3. Make panel draggable
4. Extract role / system data
5. Build buttons and actions

---

## 4. Data Extraction & Download

* Keep JSON structure clear and explicit.
* Include relevant metadata (`roleType`, `system`/`bbDeployment`, `role`, `timestamp`, `source`, `privileges`).
* Example:

```javascript
const data = { roleType, system: bbDeployment, role: roleName, timestamp, source: bbVersion, privileges };
```

---

## 5. Raw Characters

* **Always use raw characters** (`⚠`, `<b>`, `<br>`, `<hr>`) for `innerHTML`.
* Never use HTML entities like `&amp;`, `&lt;`, `&gt;`.
* Escape only user-generated input if needed.

---

## 6. Expanded vs Minified Workflow

### Expanded Version

* Fully readable and maintainable.
* Descriptive variable names.
* Comments explaining functional blocks.
* Single-line CSS.
* Raw characters in innerHTML.
* **Not limited to 2000 characters**.
* Serves as the “source of truth” for testing.

### Minified Version

* Generated from the tested expanded version.
* Must follow these rules:

  1. Remove optional spaces and semicolons.
  2. Shorten local variable names safely (`iframe → f`, `doc → d`, etc.).
  3. Remove JSON pretty-printing (`JSON.stringify(data)` vs `JSON.stringify(data,null,2)`).
  4. Preserve all functionality and raw characters.
  5. Ensure **under 2000 characters** for bookmarklet safety.

---

## 7. Summary Rules

* CSS → single-line
* JS logic → expanded & commented
* Functional blocks → separated
* Raw characters → always, never HTML entities
* Expanded version → source of truth
* Minified version → <2000 characters, short vars, no pretty JSON
* Test expanded version thoroughly before minifying
