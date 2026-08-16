# Blackboard Course Info Bookmarklet

This bookmarklet provides a lightweight way to fetch and view REST API data for courses directly from the **Admin > Courses > Courses** page in Blackboard LMS.  
It overlays small 🛈 icons next to each listed course, allowing you to quickly inspect or copy key details (e.g., ID, UUID, Ultra status, term, availability).

---

## 🧩 Features

- Works directly within the **Admin > Courses > Courses** interface  
- Adds a small 🛈 icon beside each Course ID  
- Hover over the icon to fetch full REST API data for the course  
- Click the icon to copy all course details to your clipboard  
- Displays key information including:
  - `id` (primary key)
  - `uuid`
  - `externalId`
  - `courseId`
  - `name`, `description`
  - `ultraStatus`, `termId`, `availability`, `enrollment`
  - `created`, `modified`
  - `externalAccessUrl`
- Includes a “Clear Icons” button to remove injected elements
- Caches results per page to reduce duplicate API calls

---

## ⚙️ How to Install

1. Copy the full one-line bookmarklet code from this repository (see `courseInfoBookmarklet.js` or below).  
2. In Chrome:
   - Open **Bookmarks Manager** → **Add New Bookmark**
   - Name it e.g. `Course Info 🛈`
   - Paste the code into the **URL** field  
3. Save it.

---

## ▶️ How to Use

1. Log in to Blackboard LMS as an administrator.  
2. Navigate to **Admin Panel → Courses → Courses**.  
3. Click your **Course Info 🛈** bookmark.  
4. Wait a moment for the 🛈 icons to appear next to each Course ID.  
5. Hover over an icon to load course details via the REST API.  
6. Click the icon to copy those details to the clipboard.  
7. Use the **Clear Icons** button (top right) to remove icons and reset cache.

---

## 🔍 REST API Endpoint

The bookmarklet calls:

```

/learn/api/public/v3/courses/courseId:{COURSE_ID}

```

and requests these fields:

```

id, uuid, externalId, courseId, name, description, created, modified,
ultraStatus, organization, allowGuests, allowObservers, closedComplete,
termId, availability, enrollment, locale, externalAccessUrl

```

---

## 🧱 Technical Notes

- Works within the `bb-base-admin-iframe` context  
- Requires access to the public REST API (`/learn/api/public/v3`)  
- Non-destructive — read-only API calls only  
- Tested in Chrome, compatible with current Learn SaaS builds  
- Includes error handling for missing iframe, invalid page, or blocked fetch

---

## 🧹 Clearing Injected Elements

Click the “**Clear Icons**” button at the top-right corner of the iframe to:
- Remove all 🛈 icons  
- Clear the cache  
- Remove the cleanup button itself

---

## ⚠️ Limitations

- Must be run on the `/webapps/blackboard/execute/courseManager` page  
- Requires appropriate admin REST API access  
- Doesn’t paginate across multiple result pages (each page run separately)

---

## 📄 License

This software is provided as-is, without warranty or support of any kind. Blackboard retains all rights. Use at your own risk.

