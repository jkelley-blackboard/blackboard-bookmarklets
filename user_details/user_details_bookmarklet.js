(() => {
  const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
  if (!iframe || !iframe.contentDocument) {
    alert("⚠ Go to Admin > Users > Users to run this.");
    return;
  }

  const doc = iframe.contentDocument;
  const host = doc.location.origin;
  const requiredPath = "/webapps/blackboard/execute/userManager";
  if (!doc.location.pathname.includes(requiredPath)) {
    alert("⚠ Go to Admin > Users > Users to run this.");
    return;
  }

  const cache = {};
  const clearButtonId = "clearProfileInfoIcons";
  if (!doc.querySelector(`#${clearButtonId}`)) {
    const clearBtn = doc.createElement("button");
    clearBtn.id = clearButtonId;
    clearBtn.textContent = "Clear Icons";
    Object.assign(clearBtn.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      zIndex: "9999",
      background: "purple",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "14px",
    });

    clearBtn.onclick = () => {
      doc.querySelectorAll(".profile-info-icon").forEach(icon => icon.remove());
      clearBtn.remove();
      Object.keys(cache).forEach(key => delete cache[key]);
    };

    doc.body.appendChild(clearBtn);
  }

  const spans = doc.querySelectorAll("span.profileCardAvatarThumb");
  spans.forEach(span => {
    if (span.previousSibling?.classList?.contains("profile-info-icon")) return;

    const username = span.textContent.trim();
    if (!username) return;

    const icon = doc.createElement("span");
    icon.textContent = "🛈";
    icon.title = "Hover to load user info";
    icon.className = "profile-info-icon";
    Object.assign(icon.style, {
      cursor: "pointer",
      marginRight: "6px",
    });

    icon.onmouseenter = () => {
      if (cache[username]) {
        icon.title = cache[username];
        return;
      }

      icon.title = "Loading...";
      const apiUrl = `${host}/learn/api/public/v1/users/userName:${encodeURIComponent(username)}?fields=id,externalId,lastLogin,userName,created`;

      fetch(apiUrl)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          const lastLogin = data.lastLogin ? new Date(data.lastLogin).toLocaleString() : "N/A";
          const created = data.created ? new Date(data.created).toLocaleString() : "N/A";
          const info = `User ID: ${data.id || "N/A"}\nExternal ID: ${data.externalId || "N/A"}\nLast Login: ${lastLogin}\nDate Created: ${created}`;
          icon.title = info;
          cache[username] = info;
        })
        .catch(error => {
          icon.title = "Error fetching user info";
          console.error("Fetch error:", error);
        });
    };

    span.parentElement.insertBefore(icon, span);
  });
})();
