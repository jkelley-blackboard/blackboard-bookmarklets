(() => {
  // Locate the admin iframe (the main content area)
  const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
  if (!iframe || !iframe.contentDocument) {
    alert("⚠ Please run this from the Admin > Courses > Courses page (iframe not found).");
    return;
  }

  const doc = iframe.contentDocument;
  const origin = doc.location.origin;

  // Make sure we're on the correct page
  if (!doc.location.pathname.includes("/webapps/blackboard/execute/courseManager")) {
    alert("⚠ This script only works on /webapps/blackboard/execute/courseManager");
    return;
  }

  // Cache object for course info
  const cache = {};

  // Add a cleanup button
  const cleanupId = "clearCourseInfoIcons";
  if (!doc.querySelector("#" + cleanupId)) {
    const btn = doc.createElement("button");
    btn.id = cleanupId;
    btn.textContent = "Clear Icons";
    Object.assign(btn.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      zIndex: "9999",
      background: "green",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "14px",
    });
    btn.onclick = () => {
      doc.querySelectorAll(".course-info-icon").forEach(el => el.remove());
      btn.remove();
      Object.keys(cache).forEach(k => delete cache[k]);
    };
    doc.body.appendChild(btn);
  }

  // Find all course links
  const links = doc.querySelectorAll('span.table-data-cell-value a[href*="courseMain?course_id="]');
  if (!links.length) {
    alert("⚠ No course links found on this page.");
    return;
  }

  links.forEach(link => {
    // Skip if icon already exists
    if (link.previousSibling?.classList?.contains("course-info-icon")) return;

    const courseIdText = link.textContent.trim();
    if (!courseIdText) return;

    // Create the info icon
    const icon = doc.createElement("span");
    icon.textContent = "🛈";
    icon.title = "Hover to load course info";
    icon.className = "course-info-icon";
    Object.assign(icon.style, {
      cursor: "pointer",
      marginRight: "6px",
    });

    // Hover: fetch info
    icon.onmouseenter = () => {
      if (cache[courseIdText]) {
        icon.title = cache[courseIdText];
        return;
      }

      icon.title = "Loading...";

      const apiUrl = origin + "/learn/api/public/v3/courses/courseId:" + encodeURIComponent(courseIdText) +
        "?fields=id,uuid,externalId,courseId,name,description,created,modified,ultraStatus,organization,allowGuests,allowObservers,closedComplete,termId,availability,enrollment,locale,externalAccessUrl";

      fetch(apiUrl)
        .then(response => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(data => {
          const summary =
            "Course ID: " + (data.courseId || "N/A") + "\n" +
            "External ID: " + (data.externalId || "N/A") + "\n" +
            "Primary Key: " + (data.id || "N/A") + "\n" +
            "UUID: " + (data.uuid || "N/A") + "\n" +
            "Name: " + (data.name || "N/A") + "\n" +
            "Description: " + (data.description || "N/A") + "\n" +
            "Ultra Status: " + (data.ultraStatus || "N/A") + "\n" +
            "Organization: " + (data.organization ? "Yes" : "No") + "\n" +
            "Allow Guests: " + (data.allowGuests ? "Yes" : "No") + "\n" +
            "Allow Observers: " + (data.allowObservers ? "Yes" : "No") + "\n" +
            "Closed Complete: " + (data.closedComplete ? "Yes" : "No") + "\n" +
            "Term ID: " + (data.termId || "N/A") + "\n" +
            "Availability: " + (data.availability?.available || "N/A") +
              " (" + (data.availability?.duration?.type || "N/A") + ")\n" +
            "Enrollment Type: " + (data.enrollment?.type || "N/A") + "\n" +
            "Locale Forced: " + (data.locale?.force ? "Yes" : "No") + "\n" +
            "Created: " + (data.created ? new Date(data.created).toLocaleString() : "N/A") + "\n" +
            "Modified: " + (data.modified ? new Date(data.modified).toLocaleString() : "N/A") + "\n" +
            "External Access URL: " + (data.externalAccessUrl || "N/A");

          icon.title = summary;
          cache[courseIdText] = summary;
        })
        .catch(err => {
          console.error("Fetch error:", err);
          icon.title = "Error fetching course info";
        });
    };

    // Click to copy info to clipboard
    icon.onclick = () => {
      const text = icon.title;
      if (!text || text === "Hover to load course info" || text === "Loading...") return;

      navigator.clipboard.writeText(text)
        .then(() => {
          icon.textContent = "✅";
          setTimeout(() => (icon.textContent = "🛈"), 1000);
        })
        .catch(err => {
          console.error("Clipboard error:", err);
          alert("Failed to copy course info to clipboard.");
        });
    };

    // Insert before the course link
    link.parentElement.insertBefore(icon, link);
  });
})();