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

    // ── Theme ─────────────────────────────────────────────────────────────────
    // Ultra publishes its MUI theme as --palette-* custom properties on the top
    // page's :root. Read the resolved values (Original admin iframes don't have
    // them) and fall back to Ultra's default theme. See SHARED_FUNCTIONS.md.
    const getUltraTheme = doc => {
        let cs = null;
        try { cs = window.top.getComputedStyle(window.top.document.documentElement); } catch (e) { /* cross-origin top */ }
        cs = cs || doc.defaultView.getComputedStyle(doc.documentElement);
        const tok = (name, fallback) => {
            const v = cs.getPropertyValue(`--${name}`).trim();
            return v && !/[;{}<>]/.test(v) ? v : fallback;
        };
        return {
            text: tok("palette-text-primary", "#262626"),
            muted: tok("palette-text-secondary", "#666666"),
            bg: tok("palette-background-default", "#ffffff"),
            paper: tok("palette-background-paper", "#f8f8f8"),
            divider: tok("palette-divider", "rgba(0,0,0,.12)"),
            primary: tok("palette-primary-main", "#262626"),
            primaryHover: tok("palette-primary-light", "#404040"),
            onPrimary: tok("palette-primary-contrastText", "#ffffff"),
            link: tok("palette-link-active", "#2073a1"),
            linkHover: tok("palette-link-hover", "#004270"),
            focus: tok("palette-focus-main", "#006dc7"),
            success: tok("palette-success-main", "#007d2c"),
            warning: tok("palette-warning-dark", "rgb(142,125,0)"),
            error: tok("palette-error-main", "#c23e37"),
            shadow: tok("shadows-8", "0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12)")
        };
    };
    const vars = Object.entries(getUltraTheme(document)).map(([k, v]) => `--bbp-${k}:${v}`).join(";");

    // ── Styles ────────────────────────────────────────────────────────────────
    // Injected inline to keep the bookmarklet self-contained.
    // Short class names (.h .t .b .r etc.) keep the minified size down.
    const css = `
        #${P} {
            ${vars};
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 660px; max-width: 100vw;
            background: var(--bbp-bg);
            border-left: 1px solid var(--bbp-divider);
            box-shadow: var(--bbp-shadow);
            z-index: 99999;
            display: flex; flex-direction: column;
            font: 13px/1.43 'Open Sans', sans-serif;
            color: var(--bbp-text);
            text-align: left;
        }
        #${P}, #${P} * { box-sizing: border-box; }
        #${P} button, #${P} input, #${P} select { font-family: inherit; }
        #${P} :focus-visible { outline: 2px solid var(--bbp-focus); outline-offset: 2px; }
        #${P} .h {
            background: var(--bbp-primary); color: var(--bbp-onPrimary);
            padding: 10px 16px;
            display: flex; align-items: center; justify-content: space-between;
            font-size: 16px;
            flex-shrink: 0;
        }
        #${P} .h span   { font-size: 12px; }
        #${P} .h button {
            background: none; border: 0; border-radius: 4px;
            padding: 4px 8px; font-size: 16px; line-height: 1;
            color: inherit; cursor: pointer;
        }
        #${P} .h button:hover { background: rgba(255,255,255,.15); }
        #${P} .t {
            padding: 8px 16px;
            background: var(--bbp-paper);
            border-bottom: 1px solid var(--bbp-divider);
            display: flex; flex-wrap: nowrap; gap: 6px; align-items: center;
            flex-shrink: 0; overflow: hidden;
        }
        #${P} .t input, #${P} .t select {
            height: 28px; min-height: 0; margin: 0;
            padding: 0 8px;
            border: 1px solid var(--bbp-muted);
            border-radius: 4px;
            background: var(--bbp-bg); color: var(--bbp-text);
            font-size: 12px;
            min-width: 0;
        }
        #${P} .t input  { flex: 1; min-width: 80px; }
        #${P} .t select { flex-shrink: 0; max-width: 110px; }
        /* Ultra forces appearance:none !important on selects, which hides the arrow */
        #${P} .t select { appearance: auto !important; -webkit-appearance: menulist !important; }
        #${P} .t button {
            height: 28px; margin: 0;
            padding: 0 14px;
            background: var(--bbp-primary); color: var(--bbp-onPrimary);
            border: 1px solid var(--bbp-primary); border-radius: 4px;
            font-size: 12px; font-weight: 600; cursor: pointer;
            white-space: nowrap; flex-shrink: 0;
        }
        #${P} .t button:hover { background: var(--bbp-primaryHover); }
        #${P} .b  { flex: 1; overflow-y: scroll; padding: 10px 16px; }
        #${P} .dh {
            font-size: 12px; font-weight: 600; color: var(--bbp-text);
            border-bottom: 2px solid var(--bbp-primary);
            padding: 12px 0 4px; margin-bottom: 6px;
            display: flex; gap: 6px; align-items: baseline;
        }
        #${P} .dh small { margin-left: auto; color: var(--bbp-muted); font-weight: 400; }
        #${P} .dh .s    { font-weight: 400; font-family: ui-monospace, Consolas, monospace; font-size: 10px; color: var(--bbp-muted); }
        #${P} .r {
            padding: 8px 12px;
            border: 1px solid var(--bbp-divider); border-radius: 4px;
            margin-bottom: 6px;
            display: flex; gap: 10px;
            background: var(--bbp-bg);
        }
        #${P} .r:hover  { border-color: var(--bbp-link); background: var(--bbp-paper); }
        #${P} .r .m     { flex: 1; min-width: 0; }
        #${P} .r .n     { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #${P} .r .n a   { color: var(--bbp-link); text-decoration: none; }
        #${P} .r .n a:hover { color: var(--bbp-linkHover); text-decoration: underline; }
        #${P} .r .n img { width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px; }
        #${P} .r .d     { font-size: 12px; color: var(--bbp-muted); }
        #${P} .r .u     { font-size: 10px; color: var(--bbp-muted); font-family: ui-monospace, Consolas, monospace; word-break: break-all; }
        #${P} .r .g     { font-size: 11px; color: var(--bbp-muted); }
        #${P} .r .k     { font-size: 11px; color: var(--bbp-muted); text-align: right; white-space: nowrap; flex-shrink: 0; }
        #${P} .v        { display: inline-block; padding: 0 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #fff; background: var(--bbp-muted); }
        #${P} .v13      { background: var(--bbp-success); }
        #${P} .v11      { background: var(--bbp-warning); }
        #${P} .er       { color: var(--bbp-error); }
        #${P} .ft       { padding: 6px 16px; border-top: 1px solid var(--bbp-divider); font-size: 11px; color: var(--bbp-muted); flex-shrink: 0; }
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
                <button aria-label="Close" onclick="document.getElementById('${ID}').remove()">✕</button>
            </div>
        </div>
        <div class=t>
            <input id=lps placeholder="Search…">
            <select id=lpt><option value="">All types</option></select>
            <select id=lpl>
                <option value="">All LTI</option>
                <option value="1.3">LTI 1.3</option>
                <option value="1.1">LTI 1.1</option>
            </select>
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

    // LTI version is a property of the domain (tool provider), not the placement.
    // The API has no version field: 1.3 domains carry a clientId and a JWKS URL or
    // public key, while 1.1 domains have none of these.
    const ver = id => {
        const d = DM[id] || {};
        return d.clientId || d.jwksUrl || d.publicKey ? "1.3" : "1.1";
    };
    const vb = id => { const v = ver(id); return `<span class="v v${v.replace(".", "")}">LTI ${v}</span>`; };

    // Direct link to the placement's edit page in the Original admin console
    const editLink = p => `${O}/webapps/blackboard/execute/blti/modifyPlacement?cmd=edit&placementId=${encodeURIComponent(p.id)}&domainConfigId=${encodeURIComponent(p.domainId)}`;

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
        const lv = lpl.value;
        return ALL.filter(p => {
            const { n, s } = dl(p.domainId);
            return (
                (!q  || [p.name, p.url, p.description, n, s].some(v => (v || "").toLowerCase().includes(q)))
             && (!tp || p.type === tp)
             && (!st || (av(p) ? "1" : "0") === st)
             && (!lv || ver(p.domainId) === lv)
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
                    ${vb(id)}
                    <span>${esc(n)}</span>
                    ${s ? `<span class=s>${esc(s)}</span>` : ""}
                    <small>${items.length}p</small>
                </div>`;
                const rows = items
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map(p => {
                        const fl = [p.allowStudents && "Students", p.allowGrading && "Grading"]
                            .filter(Boolean).join(" · ");
                        const icon = p.iconUrl ? `<img src="${esc(p.iconUrl)}" alt="" onerror="this.remove()">` : "";
                        return `<div class=r>
                            <div class=m>
                                <div class=n title="${esc(p.name)}"><a href="${esc(editLink(p))}" target="_blank" rel="noopener">${icon}${esc(p.name || "?")}</a></div>
                                ${p.description ? `<div class=d>${esc(p.description)}</div>` : ""}
                                ${p.url        ? `<div class=u>${esc(p.url)}</div>`         : ""}
                                ${fl           ? `<div class=g>${fl}</div>`                 : ""}
                            </div>
                            <div class=k>${vb(p.domainId)}<br>${esc(fmt(p.type))}<br>${av(p) ? "✓" : "✗"} ${av(p) ? "Avail" : "Unavail"}</div>
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
            return [n, s || n, ver(p.domainId), p.name, p.type,
                    av(p) ? "Yes" : "No",
                    p.allowStudents ? "Yes" : "No",
                    p.allowGrading  ? "Yes" : "No",
                    p.url, p.description, editLink(p), p.iconUrl]
                .map(v => `"${String(v || "").replace(/"/g, '""')}"`)
                .join(",");
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(
            [["Domain,Primary Domain,LTI Version,Name,Type,Available,Allow Students,Allow Grading,URL,Description,Edit Link,Icon URL", ...rows].join("\n")],
            { type: "text/csv" }
        ));
        a.download = `lti_placements_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ── Wire up filters ───────────────────────────────────────────────────────
    lps.oninput = lpt.onchange = lpv.onchange = lpl.onchange = refresh;

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
        lpb.innerHTML = `<span class=er><b>Error:</b> ${esc(e.message)}</span>`;
    });

})();
