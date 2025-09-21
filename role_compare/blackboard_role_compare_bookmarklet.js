javascript:(function () {
    // ====== Utility Functions ======
    function createPanel(info) {
        const panel = document.createElement("div");
        panel.id = "cmpPanel";
        panel.setAttribute("style",
            "position:fixed;top:20px;left:20px;z-index:9999;background:#fff;border:1px solid #ccc;padding:10px;min-width:340px;overflow:auto;cursor:move;"
        );
        panel.innerHTML = `<b>System:</b> ${info.system}<br>
                           <b>Role:</b> ${info.role}<br>
                           <b>Type:</b> ${info.roleType}<br>
                           <b>Date:</b> ${info.ts}<hr>`;
        document.body.appendChild(panel);
        makeDraggable(panel);
        return panel;
    }

    function makeDraggable(el) {
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        el.onmousedown = e => {
            e.preventDefault();
            x2 = e.clientX;
            y2 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = e2 => {
                e2.preventDefault();
                x1 = x2 - e2.clientX;
                y1 = y2 - e2.clientY;
                x2 = e2.clientX;
                y2 = e2.clientY;
                el.style.top = (el.offsetTop - y1) + "px";
                el.style.left = (el.offsetLeft - x1) + "px";
            };
        };
    }

    function createButton(label, onClick) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.setAttribute("style", "margin:4px;padding:6px 10px;font-size:14px;");
        btn.onclick = onClick;
        document.getElementById("cmpPanel").appendChild(btn);
    }

    function showMessage(panel, msg) {
        const div = document.createElement("div");
        div.style.color = "red";
        div.style.marginTop = "10px";
        div.innerHTML = msg;
        panel.appendChild(div);
    }

    // ====== Pagination Check ======
    function hasPagination() {
        const pager = document.querySelector(".paging");
        return pager && pager.textContent.includes("Page");
    }

    // ====== Build Privileges Map ======
    function getPrivileges() {
        const rows = document.querySelectorAll("tbody#listContainer_databody>tr");
        const map = {};
        rows.forEach(tr => {
            const name = tr.querySelector("th div")?.innerText.trim();
            const entitlement = tr.querySelector('input[type="checkbox"]')?.value;
            const img = tr.querySelector("td:nth-child(2) img")?.src || "";
            const status = img.includes("checkmark") ? "permitted" :
                           img.includes("dash") ? "inherited" : "restricted";
            if (name && entitlement) {
                map[name.replace(/^"+|"+$/g, "")] = { status, entitlement };
            }
        });
        return map;
    }

    // ====== Compare JSON ======
    function compareData(uploaded) {
        const current = getPrivileges();
        const rows = document.querySelectorAll("tbody#listContainer_databody>tr");

        rows.forEach(tr => {
            const name = tr.querySelector("th div")?.innerText.trim().replace(/^"+|"+$/g, "");
            const currentData = current[name];
            const uploadedData = uploaded.privileges[name];

            if (!uploadedData) return; // Skip if not in uploaded file

            if (currentData.status !== uploadedData.status) {
                const td = tr.querySelector("td:nth-child(2)");
                if (td) {
                    // Yellow warning icon with tooltip
                    const icon = document.createElement("span");
                    icon.innerHTML = "&#9888;"; // ⚠
                    icon.title = `Status mismatch:\nCurrent: ${currentData.status}\nUploaded: ${uploadedData.status}`;
                    icon.style.color = "orange";
                    icon.style.marginLeft = "8px";
                    td.appendChild(icon);
                }
            }
        });
    }

    // ====== Main Logic ======
    const isCoursePage = location.search.includes("type=Course");
    const isSystemPage = location.search.includes("type=System");
    const pageType = isCoursePage ? "Course" : (isSystemPage ? "System" : "Unknown");

    const info = {
        system: location.hostname,
        role: (document.querySelector("#pageTitleHeader")?.innerText || "Unknown").split(":").pop().trim(),
        roleType: pageType,
        ts: new Date().toISOString()
    };

    const panel = createPanel(info);

    // Pagination warning
    if (hasPagination()) {
        showMessage(panel, "⚠️ Pagination detected.<br>Please select 'Show All'.");
        return; // Stop here until user fixes pagination
    }

    // Create upload button
    const uploadBtn = document.createElement("input");
    uploadBtn.type = "file";
    uploadBtn.id = "uploadBtn";
    uploadBtn.setAttribute("style", "margin-top:8px;");
    uploadBtn.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const uploaded = JSON.parse(evt.target.result);

                // Validate course/system type
                if (uploaded.roleType !== pageType) {
                    showMessage(panel, `⚠️ Type mismatch: JSON is for ${uploaded.roleType} roles, but this page is ${pageType}.`);
                    return;
                }

                // Run comparison
                compareData(uploaded);
                uploadBtn.style.display = "none"; // hide after use
            } catch (err) {
                showMessage(panel, "Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    };
    panel.appendChild(uploadBtn);

    // Filter buttons
    const filterBar = document.createElement("div");
    filterBar.setAttribute("style", "margin-top:10px;");
    filterBar.innerHTML = `
        <button style="margin:4px;padding:6px 10px;" onclick="filterRows('all')">All</button>
        <button style="margin:4px;padding:6px 10px;" onclick="filterRows('perm')">Permitted</button>
        <button style="margin:4px;padding:6px 10px;" onclick="filterRows('rest')">Restricted</button>
        <button style="margin:4px;padding:6px 10px;" onclick="filterRows('inh')">Inherited</button>
        <button style="margin:4px;padding:6px 10px;float:right;" onclick="location.reload()">Refresh</button>
    `;
    panel.appendChild(filterBar);

    // Filter function
    window.filterRows = function (filter) {
        const rows = document.querySelectorAll("tbody#listContainer_databody>tr");
        rows.forEach(tr => {
            const img = tr.querySelector("td:nth-child(2) img")?.src || "";
            const status = img.includes("checkmark") ? "perm" :
                           img.includes("dash") ? "inh" : "rest";
            tr.style.display = (filter === "all" || status === filter) ? "" : "none";
        });
    };
})();
