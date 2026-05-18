# Blackboard Bookmarklet Deployment Prompt

Use this prompt when asking Claude (or another AI assistant) to package and document a new bookmarklet for the `jkelley-blackboard/blackboard-bookmarklets` repository.

---

## Prompt

I need you to package a new bookmarklet for my GitHub repository at https://github.com/jkelley-blackboard/blackboard-bookmarklets. Please produce the following three files and one JSON snippet, following the conventions below exactly.

---

### What to produce

**1. `{folder_name}/{folder_name}_bookmarklet.js`**
The annotated development version of the bookmarklet. Format requirements:
- File header block comment with: bookmarklet name, one-paragraph description, usage instructions, APIs or pages used, and author line `Author: Jef Kelley / Blackboard Solutions Engineering`
- Readable formatting with consistent 2-space indentation
- Section comments (`// ── Section Name ───`) to separate logical blocks
- Modern JavaScript (ES6+), no external dependencies, no jQuery
- The IIFE wrapper `(function() { ... })();`

**2. `{folder_name}/{folder_name}_bookmarklet.min.bk.js`**
The minified single-line bookmarklet for distribution. Format requirements:
- Must start with `javascript:`
- Single line, no line breaks
- Fully self-contained — copy-paste directly as a browser bookmark URL
- Functionally identical to the development file

**3. `{folder_name}/README.md`**
Documentation file. Format requirements:
- H1 title: the bookmarklet display name
- One-paragraph description (no client names, no specific tool/vendor names, generic Blackboard Ultra language only)
- `## Features` — bullet list of capabilities
- `## Installation` — three steps pointing to `https://jkelley-blackboard.github.io/blackboard-bookmarklets`
- `## Usage` — numbered steps; include a table if the tool has multiple output categories
- `### Notes & Troubleshooting` — subsection under Usage
- `## File Structure` — fenced code block showing the folder tree
- `## Development / Implementation Notes` — bullet list of technical implementation details
- `## Security & Disclaimer` — standard disclaimer paragraph (experimental, as-is, no warranty, check institution policy)
- No references to specific institutions, client names, or third-party product names

**4. `bookmarklets.json` entry snippet**
A single JSON object to be added to the root `bookmarklets.json` array:
```json
{
  "label": "Bb {Display Name}",
  "description": "{One sentence, active voice, no period at end — describe what it does}",
  "path": "{folder_name}/{folder_name}_bookmarklet.min.bk.js",
  "category": "{one of: Role Managers | Enhanced Display | Extractors | Other Tools | Gradebook Tools}"
}
```

---

### Repo conventions to follow

| Convention | Rule |
|---|---|
| Folder name | `snake_case`, descriptive, matches the tool function |
| JS filename | `{folder_name}_bookmarklet.js` and `{folder_name}_bookmarklet.min.bk.js` |
| README filename | `README.md` (title case) |
| Bookmarklet wrapper | Always an IIFE: `(function(){ ... })();` |
| Minified prefix | Always starts with `javascript:` |
| No external deps | No CDN imports, no jQuery, no frameworks |
| ES6+ only | Arrow functions, template literals, `const`/`let`, optional chaining |
| No client refs | READMEs are generic — no institution names, no vendor product names |
| Category options | Role Managers, Enhanced Display, Extractors, Other Tools, Gradebook Tools |
| Label prefix | Always `"Bb "` prefix in the JSON label |

---

### File structure reference

Every bookmarklet folder looks like this:

```
{folder_name}/
├── {folder_name}_bookmarklet.js          # Annotated development file
├── {folder_name}_bookmarklet.min.bk.js  # Minified bookmarklet for distribution
└── README.md                            # Documentation
```

---

### README section order (required)

1. H1 title
2. One-paragraph description
3. `---`
4. `## Features`
5. `---`
6. `## Installation`
7. `---`
8. `## Usage` (with `### Notes & Troubleshooting` subsection)
9. `---`
10. `## File Structure`
11. `---`
12. `## Development / Implementation Notes`
13. `---`
14. `## Security & Disclaimer`
15. `---`

---

### Standard Security & Disclaimer text

Use this verbatim (adjust only the environment reference if needed):

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support. Use at your own risk. It is intended for Blackboard Learn Ultra (SaaS) environments and may not be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your institution's policy for deploying custom scripts and tools.

---

### Standard Installation steps

Use these verbatim:

> 1. Open the hosted index page https://jkelley-blackboard.github.io/blackboard-bookmarklets
> 2. Find **{Display Name}** under the **{Category}** section.
> 3. Drag the button to your browser's bookmarks bar (or create a new bookmark and paste the bookmarklet code as the URL).

---

### Example bookmarklets.json entries (for reference)

```json
{ "label": "Bb Display Entitlements", "description": "Displays entitlements for all system/course roles on the privileges page", "path": "display_entitlements/display_entitlments_bookmarklet.min.bk.js", "category": "Enhanced Display" },
{ "label": "Bb User Details", "description": "Shows additional user information on Admin > Users list", "path": "user_details/user_details_bookmarklet.min.bk.js", "category": "Enhanced Display" },
{ "label": "Orphaned Grades", "description": "Identifies orphaned grade columns with no linked content item, including columns hidden from the instructor gradebook view", "path": "orphan_grades/orphan_grades_bookmarklet.min.bk.js", "category": "Gradebook Tools" }
```

---

### How to use this prompt

Paste this prompt into your conversation with the AI, then append:

> **New bookmarklet details:**
> - **Name:** {display name}
> - **Folder:** `{folder_name}`
> - **Category:** {category}
> - **What it does:** {plain English description of the tool's purpose}
> - **How it works:** {brief technical description — what pages/APIs it uses, what it reads/writes/displays}
> - **[Paste the working bookmarklet code here, or describe what it should do if starting from scratch]**

The AI will produce all three files and the JSON entry ready to commit.
