# SCORM Package Locator

Finds every SCORM item in a Blackboard LMS Ultra course and gives an administrator a clickable link to the Content Collection folder that holds each package's unpacked files. Blackboard LMS unpacks every uploaded SCORM package into the course's hidden `internal` content area, so from that folder the package can be downloaded again when the original `.zip` is lost, or checked to confirm which version a course is running.

---

## Features

- Scans the whole course outline through the REST API, including items nested in folders and learning modules
- Lists each SCORM item with its title, location in the outline, content ID and availability
- **⬇ Download zip:** downloads the package in one click, the same zip the Content Collection's Download Package builds, with `imsmanifest.xml` at its root
- **⬇ All packages:** downloads every SCORM package in the course, one after another
- **📂 Package folder:** opens `/webapps/cmsmain/webui/internal/courses/<Course ID>/content/<content ID>`, ready for **Download Package**
- **📄 imsmanifest.xml:** opens the package manifest directly, without downloading anything
- **▶ Preview:** launches the package in the Ultra SCORM player, to confirm it's the right one before downloading
- Link to the parent `content` folder that holds every SCORM package in the course
- Copy all folder links to the clipboard, or download them as CSV
- Read-only: nothing in the course is changed

---

## Installation

1. Open the live docs page: https://jkelley-blackboard.github.io/blackboard-bookmarklets
2. Find **Bb SCORM Package Locator** under **Other Tools**.
3. Drag it to your bookmarks bar (or copy the code into a new bookmark's URL field).

---

## Usage

1. Sign in to Blackboard LMS as a System Admin.
2. Open any page inside the Ultra course (the URL contains `/ultra/courses/_123_1/`).
3. Click the bookmarklet. A panel lists every SCORM item in the course.
4. Click **⬇ Download zip** for the item you want, or **⬇ All packages** for every item. The zip is named `<Course ID>_<title>_<content ID>.zip`, has `imsmanifest.xml` at its root, and can be re-uploaded as is. A status message next to each item shows the result.
5. To browse the files instead, click **📂 Package folder**. The Content Collection opens on the package's unpacked files; select all with the header checkbox and choose **Download Package** to get the same zip.

### Notes & Troubleshooting

- **Only Preview links appear:** the bookmarklet checks once whether your account can open the course's internal Content Collection area (the panel shows **Package folder access**). Without that access, normally anyone who isn't a System Admin, it hides the folder, manifest and download links instead of showing links that would fail. Instructors can still see the list, preview each package and download the CSV.
- **Browser asks to allow multiple downloads:** **⬇ All packages** saves one file per package; allow downloads for the site when the browser prompts.
- **Downloading from the parent folder:** selecting a package's subfolder from the `content` folder and using Download Package produces `content.zip` with the files wrapped in a `<content ID>/` folder. Re-zip the contents of that folder so `imsmanifest.xml` sits at the zip's root before re-uploading.
- **Won't run for students:** the bookmarklet checks your own course role first and stops with a message for the Student and Guest roles and in Student Preview, because launching a package as a student records a SCORM attempt. Instructors don't get attempts, and System Admins who aren't enrolled are allowed through.
- **No Preview link:** the launch URL couldn't be read for that item. The folder and manifest links still work; check the console for the error.
- **What you don't get back:** learner attempts and grades (those live in the gradebook and SCORM tracking), the original zip itself (Blackboard LMS rebuilds it), or source files that were never in the package.
- **Original course view:** the bookmarklet still lists SCORM items, but where Original courses store packages is unverified; the panel shows a note when the course isn't Ultra.
- **Content Collection turned off or unlicensed:** untested; the folder links may not open.
- **No SCORM items found:** the bookmarklet matches any content handler containing `scorm` (Ultra uses `resource/x-plugin-scormengine`). Check the browser console for API errors.

---

## File Structure

```
scorm_locator/
├── scorm_locator_bookmarklet.js          # Readable annotated source
├── scorm_locator_bookmarklet.min.bk.js   # Minified bookmarklet
└── README.md                             # This file
```

---

## Development / Implementation Notes

- The course key (`_860_1`) comes from the page URL; the Course ID used in the Content Collection path (`jkelley_sandbox1`) comes from `GET /learn/api/public/v1/courses/{id}`.
- Contents are fetched in one call with `GET /courses/{id}/contents?recursive=true`, following `paging.nextPage`. If that call fails, the bookmarklet walks the outline folder by folder through `/contents/{id}/children`.
- Each item's outline path is rebuilt from `parentId`, skipping the hidden `ROOT` folder.
- Link patterns:
  - Package folder: `/webapps/cmsmain/webui/internal/courses/<Course ID>/content/<content ID>`
  - Manifest: `/bbcswebdav/internal/courses/<Course ID>/content/<content ID>/imsmanifest.xml`
  - Preview: `/ultra/courses/<course key>/scorm/launchFrame?toolHref=<launch URL>&courseId=<course key>&contentId=<content ID>`
- The preview's launch URL (`/webapps/scor-scormengine-<handle>/delivery?action=launchPackage&...`) contains a plugin handle that differs by tenant, so it's read per item from the private `GET /learn/api/v1/courses/{id}/contents/{contentId}` (`contentDetail[...].launchUrl`) rather than hard-coded. Ultra expects it with `/` written as `~2F`, everything else URI-encoded except `:`, and `&from_ultra=true` appended.
- **Role guard:** the first request is `GET /courses/{id}/users/me?fields=courseRoleId&expand=user`. A `Student` or `Guest` membership, or a `_previewuser` account, stops the bookmarklet before anything else runs. A 404 (not enrolled, the usual case for admins) or any other failure lets it continue.
- **Access precheck:** before rendering, the bookmarklet GETs the first package folder page and looks for `filesForm`, the same form the download uses. Present means the account can open and download package folders; absent (non-admins get the page without it) means those controls are hidden. This tests the actual permission rather than inferring it from system role names, which would miss custom roles. Access is per course, so one probe covers every item.
- **Instructors and `/courses/1/`:** the SCORM player loads package files from `/courses/1/<Course ID>/content/<content ID>/...`, the legacy content path that now aliases Content Collection files. Course members can read individual files there, but can't list the folder (403), so the manifest is the only file list available to them. A rebuilt-from-manifest download for instructors was considered and left out: it would be incomplete for packages whose manifest doesn't list every file.
- **Download zip** reproduces the Content Collection's Download Package action (`dirList.downloadFiles` in `dirlist.js`): it GETs the package folder, copies the hidden fields of `filesForm` (including its single-use nonce) plus every `fileN` checkbox value, sets `a1=download` and `subaction=zip`, and POSTs to `<folder URL>.zip`. The folder page is fetched fresh for every download because the nonce can't be reused. **All packages** runs the downloads sequentially.
- No literal percent-escapes appear in the source, because bookmarks percent-decode the code before running it; the encoding is done at runtime with `encodeURIComponent`.
- Uses the shared `esc()`, `getUltraTheme()`, `ensurePanel()` and `addBtn()` helpers from [SHARED_FUNCTIONS.md](../SHARED_FUNCTIONS.md). The panel takes its colors, font and shadow from Ultra's theme tokens, with Ultra's default theme as the fallback.

---

## Security & Disclaimer

> This bookmarklet is **experimental** and provided **as-is**, without warranty or official support.
> Use at your own risk. It is intended for **Blackboard LMS** (SaaS/Ultra) environments and may not
> be compatible with older or heavily customized Blackboard installations.
>
> If you plan to share this tool with other administrators or instructors, consider reviewing your
> institution's policy for deploying custom scripts and tools.

---
