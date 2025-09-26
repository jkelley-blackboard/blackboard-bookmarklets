(() => {
    // ===== 1. Access iframe / verify page =====
    const f = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    if (!f || !f.contentDocument) {
        alert("⚠ Go to Admin > Users to manage role privileges.");
        return;
    }
    const d = f.contentDocument;

    if (!d.location.pathname.includes("/webapps/blackboard/execute/managePrivileges")) {
        const msg = d.createElement("div");
        msg.style = "position:fixed;top:20px;background:#fff0f0;border:1px solid red;padding:10px;min-width:280px;z-index:9999;border-radius:6px;text-align:center;font-weight:bold;";
        msg.innerText = "⚠ Go to the manage privileges of a course or system role.";
        d.body.appendChild(msg);
        msg.style.left = ((window.innerWidth - msg.offsetWidth) / 2) + "px";
        return;
    }

    // ===== 2. Styles =====
    const panelStyle = "position:fixed;top:20px;z-index:9999;background:#fdfdfd;border:2px solid #666;border-radius:8px;padding:14px;cursor:move;min-width:350px;overflow:auto;box-shadow:3px 3px 8px rgba(0,0,0,0.25);font-family:sans-serif;";
    const buttonStyle = "margin:4px;padding:6px 14px;font-size:14px;border-radius:6px;border:1px solid #888;background:#f0f0f0;cursor:pointer;transition:all 0.2s;outline:none;";

    // ===== 3. Make draggable =====
    function makeDraggable(el) {
        let x1 = 0, y1 = 0, oX = 0, oY = 0;
        el.onmousedown = (e) => {
            e.preventDefault();
            x1 = e.clientX;
            y1 = e.clientY;
            d.onmouseup = () => { d.onmouseup = null; d.onmousemove = null; };
            d.onmousemove = (e) => {
                e.preventDefault();
                oX = x1 - e.clientX;
                oY = y1 - e.clientY;
                x1 = e.clientX;
                y1 = e.clientY;
                el.style.top = (el.offsetTop - oY) + "px";
                el.style.left = (el.offsetLeft - oX) + "px";
            };
        };
    }

    // ===== 4. Create floating panel =====
    const panel = d.createElement("div");
    panel.id = "dlPanel";
    panel.style = panelStyle;
    d.body.appendChild(panel);
    makeDraggable(panel);
    panel.style.left = ((window.innerWidth - panel.offsetWidth) / 2) + "px";

    const detailsDiv = d.createElement("div");
    detailsDiv.id = "details";
    panel.appendChild(detailsDiv);

    const warnDiv = d.createElement("div");
    warnDiv.id = "paginationWarning";
    panel.appendChild(warnDiv);

    const buttonContainer = d.createElement("div");
    buttonContainer.id = "buttonContainer";
    panel.appendChild(buttonContainer);

    // ===== 5. Extract role / system data =====
    const urlParams = new URLSearchParams(d.location.search);
    const roleType = urlParams.get("type") || "Unknown";
    const allShown = urlParams.get("showAll") === "true";
    if (!allShown) {
        warnDiv.innerText = "⚠ Click Show All before downloading.";
        return;
    }

    const header = d.querySelector("#pageTitleHeader");
    const roleName = header ? header.innerText.split(":").pop().trim() : "Unknown";
    const bbDeployment = location.hostname;
    const timestamp = new Date().toISOString();

    const bbVersion = (() => {
        const base = window.parent.document.querySelector("base[href*='/ultra/uiv']");
        if (!base) return "Unknown";
        const match = base.href.match(/uiv([\d\.]+-rel\.\d+)/);
        return match ? match[1] : "Unknown";
    })();

    detailsDiv.innerHTML = `<b>Role Type:</b>${roleType}<br><b>bbDeployment:</b>${bbDeployment}<br><b>Role:</b>${roleName}<br><b>Blackboard Version:</b>${bbVersion}<br><b>Timestamp:</b>${timestamp}<hr>`;

    // ===== 6. Add button helper =====
    const addButton = (label, handler) => {
        const btn = d.createElement("button");
        btn.textContent = label;
        btn.style = buttonStyle;
        btn.onmouseover = () => { btn.style.background = "#e0e0e0"; };
        btn.onmouseout = () => { btn.style.background = "#f0f0f0"; };
        btn.onclick = handler;
        buttonContainer.appendChild(btn);
    };

    // ===== 7. Add Download JSON button =====
    addButton("Download JSON", () => {
        const rows = d.querySelectorAll("tbody#listContainer_databody>tr");
        const privileges = {};
        rows.forEach(tr => {
            const nameEl = tr.querySelector("th div");
            const name = nameEl ? nameEl.innerText.trim() : null;
            const entitlementEl = tr.querySelector('input[type="checkbox"]');
            const entitlement = entitlementEl ? entitlementEl.value : null;
            const img = tr.querySelector("td:nth-child(2) img");
            const imgSrc = img ? img.getAttribute("src") : "";
            const status = imgSrc.includes("checkmark") ? "permitted" : imgSrc.includes("dash") ? "inherited" : "restricted";
            if (name && entitlement) {
                privileges[name.replace(/^"+|"+$/g, "")] = { status, entitlement };
            }
        });

        const data = {
            source: {
                roleType,
                bbDeployment,
                role: roleName,
                timestamp,
                bbVersion
            },
            privileges
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = d.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `bb_${roleType.toLowerCase()}_priv_${roleName.replace(/\s+/g, "_")}.json`;
        a.click();
    });

    // ===== 8. Add Refresh Frame button =====
    addButton("Refresh Frame", () => { f.contentWindow.location.reload(); });

})();
