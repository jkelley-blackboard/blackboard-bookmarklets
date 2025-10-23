# 📊 View Analytics IDs Bookmarklet

This bookmarklet highlights all elements on a Blackboard page that contain a `data-analytics-id` or `analytics-id` attribute. It is designed to help developers and administrators quickly identify and interact with analytics-tagged elements.

It is especially helpful when working in Illuminate's CDM_TLM.ultra_events view. Where they map to the objectId field.

Example: "objectId": "ai.chat.chat.controls.send"

## ✨ Features

- ✅ **Visual Highlighting**: All matching elements are outlined with a dashed light green border.
- 🖱️ **Hover Tooltips**: When you hover over a highlighted element, a floating tooltip displays the analytics ID.
- 📋 **Click-to-Copy**: Clicking a highlighted element copies its analytics ID to your clipboard. A brief `"Copied!"` message confirms success.
- 🔄 **Toggle Tooltips**: A floating toggle button in the top-right corner lets you enable or disable tooltips for easier page navigation.

## 🔧 How to Use

1. Visit the [GitHub Pages main page](https://jkelley-blackboard.github.io/blackboard-bookmarklets/) for this repo.
2. To install the bookmarklet, **drag and drop** the `View Analytics IDs` link from the page into your browser’s bookmarks bar.
3. Alternatively, create a new bookmark manually:
   - Paste the minified one-liner into the **URL** field.
   - Name it something like `View Analytics IDs`.
4. Navigate to a Blackboard page and click the bookmarklet to activate.
5. Hover over any highlighted element to see its analytics ID.
6. Click a highlighted element to **copy its ID to the clipboard**.
7. Use the floating toggle button in the top-right corner to **enable or disable tooltips** for easier page navigation.

## 🛠 Development Notes

- The script recursively processes `iframe` and `frame` elements to ensure analytics IDs are detected across embedded content.
- Clipboard functionality uses the modern `navigator.clipboard.writeText()` API and may require HTTPS context.
- The toggle button is injected into the page and remains fixed in the top-right corner for easy access.

