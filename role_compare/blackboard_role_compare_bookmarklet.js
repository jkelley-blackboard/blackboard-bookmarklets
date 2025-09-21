(() => {
    // 1. Get iframe document
    const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    if (!iframe || !iframe.contentDocument) {
        alert("⚠ Go to Admin > Users to manage role privileges.");
        return;
    }
    const doc = iframe.contentDocument;

    // 2. Check managePrivileges page
    if (!doc.location.pathname.includes("/webapps/blackboard/execute/managePrivileges")) {
        const msg = doc.createElement("div");
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.background = "#fff";
        msg.style.border = "1px solid red";
        msg.style.padding = "10px";
        msg.style.minWidth = "280px";
        msg.style.zIndex = "9999";
        msg.innerHTML = '⚠ Go to the manage privileges of a course or system role.';
        doc.body.appendChild(msg);
        msg.style.left = ((window.innerWidth - msg.offsetWidth) / 2) + "px";
        return;
    }

    // 3. Styles
    const panelStyle = 'position:fixed;top:20px;z-index:9999;background:#ffffcc;border:4px solid black;border-radius:6px;padding:12px;cursor:move;min-width:320px;overflow:auto;box-shadow:2px 2px 6px rgba(0,0,0,0.2);';
    const buttonStyle = 'margin:4px;padding:6px 12px;font-size:14px;border-radius:4px;border:1px solid #666;background:#f9f9f9;cursor:pointer;transition:all 0.2s;outline:none;';
    const highlightStyle = '#ffd'; // Highlight for permitted privileges

    // 4. Make panel draggable
    const makeDraggable = (el) => {
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        el.onmousedown = (e) => {
            e.preventDefault();
            x2 = e.clientX; y2 = e.clientY;
            doc.onmouseup = () => { doc.onmouseup = null; doc.onmousemove = null; };
            doc.onmousemove = (e) => {
                e.preventDefault();
                x1 = x2 - e.clientX;
                y1 = y2 - e.clientY;
                x2 = e.clientX; y2 = e.clientY;
                el.style.top = (el.offsetTop - y1) + "px";
                el.style.left = (el.offsetLeft - x1) + "px";
            };
        };
    };

    // 5. Build control panel
    const panel = doc.createElement("div");
    panel.id = "cmpPanel";
    panel.setAttribute("style", panelStyle);
    panel.innerHTML = '<div id="paginationWarning"></div>' +
                      '<div id="roleDetails"></div>' +
                      '<div id="buttonContainer"></div><hr>' +
                      '<div>' +
                        '<label><input type="checkbox" id="showPerm" checked> Permitted</label>' +
                        '<label><input type="checkbox" id="showInh" checked> Inherited</label>' +
                        '<label><input type="checkbox" id="showRest" checked> Restricted</label>' +
                      '</div>';
    doc.body.appendChild(panel);
    makeDraggable(panel);
    panel.style.left = ((window.innerWidth - panel.offsetWidth) / 2) + "px";

    // 6. Pagination check
    const urlParams = new URLSearchParams(doc.location.search);
    const roleType = urlParams.get("type") || "Unknown";
    const allShown = urlParams.get("showAll") === "true";
    const warnDiv = doc.getElementById("paginationWarning");
    if (!allShown) {
        warnDiv.innerHTML = "⚠ Click Show All before comparing.";
        return;
    } else {
        warnDiv.innerHTML = "";
    }

    // 7. Add buttons
    const buttonContainer = doc.getElementById("buttonContainer");
    const addButton = (label, handler) => {
        const btn = doc.createElement("button");
        btn.textContent = label;
        btn.setAttribute("style", buttonStyle);
        btn.onclick = handler;
        buttonContainer.appendChild(btn);
    };

    // Refresh frame button
    addButton("Refresh Frame", () => { iframe.contentWindow.location.reload(); });

    // Upload JSON button
    addButton("Upload JSON", () => {
        const input = doc.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const infoDiv = doc.getElementById("roleDetails");
                    infoDiv.innerHTML = '<b>Role Type:</b> ' + data.roleType +
                                        '<br><b>System:</b> ' + data.system +
                                        '<br><b>Role:</b> ' + data.role +
                                        '<br><b>Date:</b> ' + data.timestamp;

                    const rows = doc.querySelectorAll("tbody#listContainer_databody>tr");
                    rows.forEach(tr => {
                        const name = tr.querySelector("th div")?.innerText.trim();
                        const ent = tr.querySelector('input[type="checkbox"]')?.value;
                        if (name && ent && data.privileges[name]) {
                            const status = data.privileges[name].status;
                            if (status === "permitted") tr.style.background = highlightStyle;
                        }
                    });

                    // Filters
                    const filter = () => {
                        const showPerm = doc.getElementById("showPerm").checked;
                        const showInh = doc.getElementById("showInh").checked;
                        const showRest = doc.getElementById("showRest").checked;
                        rows.forEach(tr => {
                            const name = tr.querySelector("th div")?.innerText.trim();
                            if (!name || !data.privileges[name]) return;
                            const s = data.privileges[name].status;
                            tr.style.display = (s === "permitted" && showPerm) ||
                                               (s === "inherited" && showInh) ||
                                               (s === "restricted" && showRest) ? "" : "none";
                        });
                    };
                    ["showPerm","showInh","showRest"].forEach(id => {
                        doc.getElementById(id).onchange = filter;
                    });
                    filter();

                    alert("JSON uploaded and privileges highlighted.");
                } catch(err) {
                    alert("Invalid JSON file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
})();
