javascript:(() => {
    // ----- 1. Get iframe document -----
    const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    if (!iframe || !iframe.contentDocument) {
        alert("⚠ Go to Admin > Users to manage role privileges.");
        return;
    }
    const doc = iframe.contentDocument;

    // ----- 2. Verify page -----
    if (!doc.location.pathname.includes("/webapps/blackboard/execute/managePrivileges")) {
        const msg = doc.createElement("div");
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.background = "#fff";
        msg.style.border = "1px solid red";
        msg.style.padding = "10px";
        msg.style.minWidth = "280px";
        msg.style.zIndex = "9999";
        msg.innerHTML = "⚠ Go to the manage privileges of a course or system role.";
        doc.body.appendChild(msg);
        msg.style.left = ((window.innerWidth - msg.offsetWidth) / 2) + "px";
        return;
    }

    // ----- 3. Styles -----
    const panelStyle = `
        position:fixed;
        top:20px;
        z-index:9999;
        background:#ffffcc;
        border:4px solid black;
        border-radius:6px;
        padding:12px;
        cursor:move;
        min-width:320px;
        overflow:auto;
        box-shadow:2px 2px 6px rgba(0,0,0,0.2);
    `;
    const buttonStyle = `
        margin:4px;
        padding:6px 12px;
        font-size:14px;
        border-radius:4px;
        border:1px solid #666;
        background:#f9f9f9;
        cursor:pointer;
        transition:all 0.2s;
        outline:none;
    `;

    // ----- 4. Draggable panel -----
    const makeDraggable = (el) => {
        let x1=0,y1=0,x2=0,y2=0;
        el.onmousedown = (e) => {
            e.preventDefault();
            x2 = e.clientX; y2 = e.clientY;
            doc.onmouseup = () => { doc.onmouseup=null; doc.onmousemove=null; };
            doc.onmousemove = (e) => {
                e.preventDefault();
                x1 = x2 - e.clientX; y1 = y2 - e.clientY;
                x2 = e.clientX; y2 = e.clientY;
                el.style.top = (el.offsetTop - y1) + "px";
                el.style.left = (el.offsetLeft - x1) + "px";
            };
        };
    };

    // ----- 5. Create panel -----
    const panel = doc.createElement("div");
    panel.id = "dlPanel";
    panel.style = panelStyle;
    panel.innerHTML = `
        <div id="details"></div>
        <div id="paginationWarning"></div>
        <div id="buttonContainer"></div>
    `;
    doc.body.appendChild(panel);
    makeDraggable(panel);
    panel.style.left = ((window.innerWidth - panel.offsetWidth)/2) + "px";

    // ----- 6. Pagination check -----
    const urlParams = new URLSearchParams(doc.location.search);
    const roleType = urlParams.get("type") || "Unknown";
    const allShown = urlParams.get("showAll") === "true";
    const warnDiv = doc.getElementById("paginationWarning");
    if (!allShown) {
        warnDiv.innerHTML = "⚠ Click Show All before downloading.";
        return;
    } else {
        warnDiv.innerHTML = "";
    }

    // ----- 7. Add buttons -----
    const buttonContainer = doc.getElementById("buttonContainer");
    const addButton = (label, handler) => {
        const btn = doc.createElement("button");
        btn.textContent = label;
        btn.style = buttonStyle;
        btn.onclick = handler;
        buttonContainer.appendChild(btn);
    };

    // ----- 8. Render details in panel -----
    const detailsDiv = doc.getElementById("details");
    const roleName = (doc.querySelector("#pageTitleHeader")?.innerText || "Unknown").split(":").pop().trim();
    const timestamp = new Date().toISOString();
    detailsDiv.innerHTML = `
        <b>Role Type:</b> ${roleType}<br>
        <b>System:</b> ${location.hostname}<br>
        <b>Role:</b> ${roleName}<br>
        <b>Timestamp:</b> ${timestamp}
        <hr>
    `;

    // ----- 9. Download JSON -----
    addButton("Download JSON", () => {
        const rows = doc.querySelectorAll("tbody#listContainer_databody>tr");
        const privileges = {};
        rows.forEach((tr) => {
            const name = tr.querySelector("th div")?.innerText.trim();
            const entitlement = tr.querySelector('input[type="checkbox"]')?.value;
            const imgSrc = tr.querySelector("td:nth-child(2) img")?.getAttribute("src") || "";
            const status = imgSrc.includes("checkmark") ? "permitted" :
                           imgSrc.includes("dash") ? "inherited" : "restricted";
            if (name && entitlement) privileges[name.replace(/^"+|"+$/g,"")] = { status, entitlement };
        });

        const data = {
            roleType,
            system: location.hostname,
            role: roleName,
            timestamp,
            privileges
        };

        const blob = new Blob([JSON.stringify(data,null,2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = doc.createElement("a");
        a.href = url;
        a.download = `bb_${roleType.toLowerCase()}_priv_${roleName.replace(/\s+/g,"_")}.json`;
        a.click();
    });

    // ----- 10. Refresh frame -----
    addButton("Refresh Frame", () => {
        iframe.contentWindow.location.reload();
    });
})();
