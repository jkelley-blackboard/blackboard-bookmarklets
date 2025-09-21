javascript:(() => {
    // ----- 1. Verify we are on a valid page -----
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const roleType = params.get("type"); // "System" or "Course"

    // Only allow on managePrivileges page
    if (!path.includes("/webapps/blackboard/execute/managePrivileges")) {
        const warn = document.createElement("div");
        warn.setAttribute("style",
            "position:fixed;top:20px;left:20px;z-index:9999;background:#fff;" +
            "border:1px solid #f00;padding:10px;min-width:280px;cursor:default;"
        );
        warn.innerHTML = `
            ⚠️ Not on Manage Privileges page.<br>
            Go to <a href='/webapps/blackboard/execute/systemRoleManager'>System Roles</a>
            or <a href='/webapps/blackboard/execute/courseRoleManager'>Course Roles</a>
        `;
        document.body.appendChild(warn);
        return;
    }

    // ----- 2. Styles -----
    const panelStyle = "position:fixed;top:20px;left:20px;z-index:9999;" +
        "background:#fff;border:1px solid #ccc;padding:10px;cursor:move;min-width:320px;overflow:auto;";
    const buttonStyle = "margin:4px;padding:6px 10px;font-size:14px;";

    // ----- 3. Make panel draggable -----
    const makeDraggable = (el) => {
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        el.onmousedown = (e) => {
            e.preventDefault();
            x2 = e.clientX;
            y2 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = (e) => {
                e.preventDefault();
                x1 = x2 - e.clientX;
                y1 = y2 - e.clientY;
                x2 = e.clientX;
                y2 = e.clientY;
                el.style.top = (el.offsetTop - y1) + "px";
                el.style.left = (el.offsetLeft - x1) + "px";
            };
        };
    };

    // ----- 4. Build control panel -----
    const addPanel = (info) => {
        const p = document.createElement("div");
        p.id = "dlPanel";
        p.setAttribute("style", panelStyle);
        p.innerHTML = `
            <b>Role Type:</b> ${info.roleType}<br>
            <b>System:</b> ${info.system}<br>
            <b>Role:</b> ${info.role}<br>
            <b>Date:</b> ${info.timestamp}
            <hr>
            <div id="paginationWarning"></div>
            <div id="buttonContainer"></div>
        `;
        document.body.appendChild(p);
        makeDraggable(p);
        return p;
    };

    const addButton = (label, handler) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.setAttribute("style", buttonStyle);
        b.onclick = handler;
        document.getElementById("buttonContainer").appendChild(b);
        return b;
    };

    // ----- 5. Check for pagination -----
    const hasPagination = () => {
        const nav = document.getElementById("listContainer_navpaging_top");
        if (!nav) return false;
        return nav.innerText.includes("Page") || nav.querySelector("a");
    };

    const updatePaginationWarning = () => {
        const warnDiv = document.getElementById("paginationWarning");
        if (hasPagination()) {
            warnDiv.innerHTML = `
                ⚠️ Multiple pages detected.<br>
                Use "Show All" to display all privileges before downloading.
            `;
            return true;
        } else {
            warnDiv.innerHTML = "";
            return false;
        }
    };

    // ----- 6. Download JSON -----
    const downloadPrivileges = () => {
        // Prevent running if pagination exists
        if (updatePaginationWarning()) {
            alert("Please switch to 'Show All' before downloading.");
            return;
        }

        const rows = document.querySelectorAll("tbody#listContainer_databody > tr");
        const privileges = {};

        rows.forEach(tr => {
            const name = tr.querySelector("th div")?.innerText.trim();
            const entitlement = tr.querySelector('input[type="checkbox"]')?.value;
            const src = tr.querySelector("td:nth-child(2) img")?.getAttribute("src") || "";
            const status = src.includes("checkmark")
                ? "permitted"
                : src.includes("dash")
                    ? "inherited"
                    : "restricted";

            if (name && entitlement) {
                privileges[name.replace(/^"+|"+$/g, "")] = {
                    status,
                    entitlement
                };
            }
        });

        const data = {
            roleType, // "System" or "Course"
            system: location.hostname,
            role: (document.querySelector("#pageTitleHeader")?.innerText || "Unknown")
                .split(":").pop().trim(),
            timestamp: new Date().toISOString(),
            privileges
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bb_${roleType.toLowerCase()}_priv_${data.role.replace(/\s+/g, "_")}.json`;
        a.click();
    };

    // ----- 7. Gather role info -----
    const roleTitle = (document.querySelector("#pageTitleHeader")?.innerText || "Unknown")
        .split(":").pop().trim();
    const info = {
        roleType,
        system: location.hostname,
        role: roleTitle,
        timestamp: new Date().toISOString()
    };

    // ----- 8. Create panel -----
    addPanel(info);

    // Add Download button (only works when pagination warning is clear)
    addButton("Download JSON", downloadPrivileges);

    // Initial pagination check
    updatePaginationWarning();
})();
