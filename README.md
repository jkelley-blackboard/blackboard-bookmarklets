# Blackboard Bookmarklets

A collection of **experimental bookmarklets** for Blackboard Learn administrators and support teams.
These lightweight tools run directly in your browser on the relevant Blackboard page — no installation, no extensions, no special permissions required.

> ⚠ **Experimental.** These bookmarklets are provided as-is, without warranty or official support from Blackboard or Anthology. Use at your own risk, and verify behavior in a test environment before using in production. They may break after Blackboard SaaS updates.

---

## 🌐 Live Tool Page

The best place to browse, install, and learn about individual bookmarklets is the **live docs page**:

### **[➡ blackboard-bookmarklets launcher](https://jkelley-blackboard.github.io/blackboard-bookmarklets/)**

From there you can drag any bookmarklet directly to your browser's bookmarks bar, or copy the code to create a bookmark manually.

---

## 📖 What Is a Bookmarklet?

A **bookmarklet** is a small JavaScript program stored as a browser bookmark. When clicked, it executes in the context of whatever page you're currently viewing — in this case, a Blackboard Learn page.

**Why use bookmarklets?**
- No installation or deployment required
- No browser extensions or elevated permissions needed
- Easy to share across a team
- Work alongside Blackboard without modifying it

---

## 🗂 Project Structure

Each bookmarklet lives in its own folder and follows a consistent pattern:

```
bookmarklet-name/
├── bookmarklet-name.js          # Readable source
├── bookmarklet-name.min.bk.js  # Minified bookmarklet (what the page loads)
└── README.md                    # Usage instructions for this tool
```

The live docs page is driven by **`docs/bookmarklets.json`** — a simple registry that maps each tool to its category, label, description, and minified file path. The page fetches and renders this automatically, so the tool listing always stays current.

---

## 🤝 Contributing

Contributions are welcome — new bookmarklets, bug fixes, or improvements to existing tools.

### Adding a new bookmarklet

1. Fork the repository and create a new branch.
2. Create a folder for your tool following the structure above.
3. Write your bookmarklet as readable source, then produce a minified version prefixed with `javascript:`.
4. Add a `README.md` in the folder describing what the tool does, which Blackboard page to run it on, and any known limitations.
5. Add an entry to **`docs/bookmarklets.json`**:

```json
{
  "label": "Your Tool Name",
  "description": "One sentence describing what it does.",
  "path": "your-folder/your-tool.min.bk.js",
  "category": "Existing or New Category"
}
```

6. Submit a pull request with a description of the change.

### Bug fixes & improvements

If a bookmarklet breaks after a Blackboard update, please open an issue or submit a fix directly. Include the Blackboard version (if known) and a description of the failure.

### Guidelines

- Keep tools focused on a single task
- Avoid storing or transmitting user data externally
- Follow your institution's IT policies before deploying to a shared team

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

**Created by** [Jeff Kelley](https://github.com/jkelley-blackboard) · Solutions Engineer, Anthology  
*Anthology retains rights to these projects. Provided without warranty or support.*
