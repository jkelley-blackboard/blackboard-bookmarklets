// Blackboard LTI Placements Viewer
// Fetches all LTI placements and domains via REST API, groups placements
// by domain, and displays them in a slide-in panel with search, filtering,
// and CSV export.
//
// Run from any Blackboard page while logged in as an administrator.
// Click again or press Escape to close.

(() => {
    const ID = "bb-lti-panel";

    // Toggle off if already open
    const ex = document.getElementById(ID);
    if (ex) { ex.remove(); return; }

    const O = location.origin;
    const P = ID;

    // ── Styles ────────────────────────────────────────────────────────────────
    // Injected inline to keep the bookmarklet self-contained.
    // Short class names (.h .t .b .r etc.) keep the minified size down.
    const css = `
        #${P} {
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 660px; max-width: 100vw;
            background: #fff;
            border-left: 3px solid #002447;
            box-shadow: -4px 0 16px rgba(0,0,0,.2);
            z-index: 99999;
            display: flex; flex-direction: column;
            font: 13px/1.4 Arial, sans-serif;
            color: #222;
        }
        #${P} .h {
            background: #002447; color: #fff;
            padding: 9px 13px;
            display: flex; align-items: center; justify-content: space-between;
            flex-shrink: 0;
        }
        #${P} .t {
            padding: 6px 13px;
            background: #f5f7fa;
            border-bottom: 1px solid #ddd;
            display: flex; flex-wrap: nowrap; gap: 5px; align-items: center;
            flex-shrink: 0; overflow: hidden;
        }
        #${P} .t input, #${P} .t select {
            padding: 3px 6px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 11px;
            font-family: inherit;
            min-width: 0;
        }
        #${P} .t input  { flex: 1; min-width: 80px; }
        #${P} .t select { flex-shrink: 0; max-width: 110px; }
        #${P} .t button {
            padding: 5px 14px;
            background: #0057a8; color: #fff;
            border: none; border-radius: 3px;
            font-size: 12px; font-weight: 700; cursor: pointer;
            white-space: nowrap; flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        #${P} .t button:hover { background: #0073cc; }
        #${P} .b  { flex: 1; overflow-y: scroll; padding: 10px 13px; }
        #${P} .dh {
            font-size: 11px; font-weight: 700; color: #002447;
            border-bottom: 2px solid #002447;
            padding: 12px 0 4px; margin-bottom: 4px;
            display: flex; gap: 6px; align-items: baseline;
        }
        #${P} .dh small { margin-left: auto; color: #aaa; font-weight: 400; }
        #${P} .r {
            padding: 7px 10px;
            border: 1px solid #ccc; border-radius: 4px;
            margin-bottom: 7px;
            display: flex; gap: 10px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,.06);
        }
        #${P} .r:hover  { border-color: #7aaddc; background: #f0f6ff; }
        #${P} .r .m     { flex: 1; min-width: 0; }
        #${P} .r .n     { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #${P} .r .d     { font-size: 11px; color: #888; }
        #${P} .r .u     { font-size: 10px; color: #555; font-family: monospace; word-break: break-all; }
        #${P} .r .g     { font-size: 10px; color: #999; }
        #${P} .r .k     { font-size: 10px; color: #555; text-align: right; white-space: nowrap; flex-shrink: 0; }
        #${P} .ft       { padding: 5px 13px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; flex-shrink: 0; }
    `;

    // ── Panel HTML ────────────────────────────────────────────────────────────
    const div = document.createElement("div");
    div.id = ID;
    div.innerHTML = `
        <style>${css}</style>
        <div class=h>
            <b>LTI Placements</b>
            <div style="display:flex;align-items:center;gap:10px">
                <span id=lpc></span>
                <button onclick="document.getElementById('${ID}').remove()">✕</button>
            </div>
        </div>
        <div class=t>
            <input id=lps placeholder="Search…">
            <select id=lpt><option value="">All types</option></select>
            <select id=lpv>
                <option value="">All status</option>
                <option value=1>Available</option>
                <option value=0>Unavailable</option>
            </select>
            <button id=lpd>⬇ CSV</button>
        </div>
        <div class=b id=lpb><i>Loading…</i></div>
        <div class=ft id=lpf></div>
    `;
    document.body.appendChild(div);

    // ── Close handlers ────────────────────────────────────────────────────────
    const ek = e => {
        if (e.key === "Escape") {
            div.remove();
            document.removeEventListener("keydown", ek);
        }
    };
    document.addEventListener("keydown", ek);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const esc = v => String(v || "").replace(/[&<>"]/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
    ));

    const fmt = t => {
        if (!t) return "?";
        // Handle known compound words before splitting on capitals
        return t
            .replace("UltraUI", "Ultra UI")
            .replace("ContentItem", "Content Item")
            .replace("BaseNav", "Base Nav")
            .replace("CourseNav", "Course Nav")
            .replace(/([A-Z])/g, " $1").trim();
    };

    const av = p => p.availability?.available !== "No";

    // Paginated fetch — retrieves all results regardless of total count
    async function get(url) {
        let out = [], off = 0;
        for (;;) {
            const r = await fetch(
                `${url}${url.includes("?") ? "&" : "?"}limit=200&offset=${off}`,
                { credentials: "include" }
            );
            if (!r.ok) {
                const e = await r.json().catch(() => {});
                throw new Error(e?.message || `HTTP ${r.status}`);
            }
            const d = await r.json(), b = d.results || [];
            out = out.concat(b);
            if (!d.paging?.nextPage || b.length < 200) break;
            off += 200;
        }
        return out;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let ALL = [], DM = {};

    // Returns display name and optional subtitle for a domain ID
    const dl = id => {
        const d = DM[id];
        return d
            ? { n: d.name || d.primaryDomain, s: d.name ? d.primaryDomain : "" }
            : { n: id, s: "" };
    };

    // ── Filter ────────────────────────────────────────────────────────────────
    const filt = () => {
        const q  = lps.value.toLowerCase();
        const tp = lpt.value;
        const st = lpv.value;
        return ALL.filter(p => {
            const { n, s } = dl(p.domainId);
            return (
                (!q  || [p.name, p.url, p.description, n, s].some(v => (v || "").toLowerCase().includes(q)))
             && (!tp || p.type === tp)
             && (!st || (av(p) ? "1" : "0") === st)
            );
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const draw = list => {
        if (!list.length) { lpb.innerHTML = "<i>No results.</i>"; return; }

        // Group by domain
        const g = {};
        list.forEach(p => (g[p.domainId] = g[p.domainId] || []).push(p));

        lpb.innerHTML = Object.entries(g)
            .sort(([a], [b]) => dl(a).n.localeCompare(dl(b).n))
            .map(([id, items]) => {
                const { n, s } = dl(id);
                const header = `<div class=dh>
                    <span>${esc(n)}</span>
                    ${s ? `<span style="font-weight:400;font-family:monospace;font-size:10px;color:#aaa">${esc(s)}</span>` : ""}
                    <small>${items.length}p</small>
                </div>`;
                const rows = items
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map(p => {
                        const fl = [p.allowStudents && "Students", p.allowGrading && "Grading"]
                            .filter(Boolean).join(" · ");
                        return `<div class=r>
                            <div class=m>
                                <div class=n title="${esc(p.name)}">${esc(p.name || "?")}</div>
                                ${p.description ? `<div class=d>${esc(p.description)}</div>` : ""}
                                ${p.url        ? `<div class=u>${esc(p.url)}</div>`         : ""}
                                ${fl           ? `<div class=g>${fl}</div>`                 : ""}
                            </div>
                            <div class=k>${esc(fmt(p.type))}<br>${av(p) ? "✓" : "✗"} ${av(p) ? "Avail" : "Unavail"}</div>
                        </div>`;
                    }).join("");
                return header + rows;
            }).join("");
    };

    // ── Refresh (filter + draw + count) ──────────────────────────────────────
    const refresh = () => {
        const f = filt();
        draw(f);
        lpc.textContent = f.length === ALL.length
            ? `${ALL.length} placements`
            : `${f.length}/${ALL.length}`;
    };

    // ── CSV export ────────────────────────────────────────────────────────────
    lpd.onclick = () => {
        const rows = filt().map(p => {
            const { n, s } = dl(p.domainId);
            return [n, s || n, p.name, p.type,
                    av(p) ? "Yes" : "No",
                    p.allowStudents ? "Yes" : "No",
                    p.allowGrading  ? "Yes" : "No",
                    p.url, p.description]
                .map(v => `"${String(v || "").replace(/"/g, '""')}"`)
                .join(",");
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(
            [["Domain,Primary Domain,Name,Type,Available,Allow Students,Allow Grading,URL,Description", ...rows].join("\n")],
            { type: "text/csv" }
        ));
        a.download = `lti_placements_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ── Wire up filters ───────────────────────────────────────────────────────
    lps.oninput = lpt.onchange = lpv.onchange = refresh;

    // ── Fetch placements and domains in parallel ──────────────────────────────
    Promise.all([
        get(`${O}/learn/api/public/v1/lti/placements`),
        get(`${O}/learn/api/public/v1/lti/domains`)
    ]).then(([pl, dm]) => {
        dm.forEach(d => DM[d.id] = d);
        ALL = pl;

        // Populate type dropdown from live data
        const sel = document.getElementById("lpt");
        [...new Set(pl.map(p => p.type).filter(Boolean))].sort()
            .forEach(t => sel.add(new Option(fmt(t), t)));

        lpf.textContent = `${O} · ${new Date().toLocaleString()}`;
        refresh();
    }).catch(e => {
        lpb.innerHTML = `<span style=color:red><b>Error:</b> ${esc(e.message)}</span>`;
    });

})();
