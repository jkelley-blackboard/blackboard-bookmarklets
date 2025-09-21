# Blackboard Analytics ID Hover Bookmarklet

This bookmarklet highlights elements on a Blackboard page that have **Analytics IDs**.  
Hovering over these elements displays their ID in a floating tooltip.

---

## Features

- Outlines elements with `data-analytics-id` or `analytics-id` using a **dashed light green border**.
- Shows a tooltip near the cursor with the element's analytics ID.
- Works recursively inside **iframes** on the page.
- Read-only: Does not modify Blackboard data.

---

## Usage

1. Copy the bookmarklet code from `blackboard_analytics_id_hover.js`.
2. Create a new browser bookmark:
   - **Name:** `BB Analytics IDs`
   - **URL:** Paste the code.
3. Navigate to any Blackboard page.
4. Hover over elements with analytics IDs to see the tooltip.

---

## Safety Notes

- **Read-only:** The bookmarklet only reads IDs and adds temporary outlines and tooltips.
- **Cross-origin iframes:** IDs in iframes from other domains may not be accessible due to browser security restrictions.

---

[Back to Project Overview](../README.md)
