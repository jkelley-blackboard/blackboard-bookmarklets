(() => {
  /* ===========================
     Helpers & page detection
  ============================ */
  const getDoc = () => {
    const f = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    return { frame: f, doc: f?.contentDocument || document, win: f?.contentWindow || window };
  };
  const onManagePrivileges = (d) =>
    d.location.pathname.includes('/webapps/blackboard/execute/managePrivileges');
  const isShowAll = (d) => new URLSearchParams(d.location.search).get('showAll') === 'true';

  // Escape for text we inject into innerHTML
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const addBtn = (d, wrap, label, fn, id) => {
    const b = d.createElement('button');
    b.textContent = label;
    if (id) b.id = id;
    b.className = 'cmp-btn';
    b.onclick = fn;
    wrap.appendChild(b);
  };

  const getPageRoleType = (d) => new URLSearchParams(d.location.search).get('type') || '';

  /* ===========================
     Role name extraction (patched)
     - Prefer #pageTitleText
     - Take text AFTER first colon (":" or "："); if none, use full string
     - If Course/Organization, normalize [/ \ : * ? " < > |] -> "_", collapse, trim
  ============================ */
  const getRoleDisplayName = (doc) => {
    const raw = (
      doc.querySelector('#pageTitleText')?.textContent ||
      doc.querySelector('h1')?.innerText ||
      doc.title ||
      ''
    ).trim();

    const roleAfterColon = (() => {
      const i1 = raw.indexOf(':'), i2 = raw.indexOf('：');
      const i = (i1 >= 0 && i2 >= 0) ? Math.min(i1, i2) : (i1 >= 0 ? i1 : i2);
      return (i >= 0) ? raw.slice(i + 1).trim() : raw;
    })();

    let role = roleAfterColon || 'Role';

    const type = (new URLSearchParams(doc.location.search).get('type') || '').toLowerCase();
    const isCourseLike = /^(course|organization)/.test(type);
    if (isCourseLike) {
      role = role
        .replace(/[\/\\:*?"<>|]/g, '_')   // normalize special chars
        .replace(/__+/g, '_')             // collapse multiple underscores
        .replace(/^_+|_+$/g, '');         // trim underscores
    }
    return role || 'Role';
  };

  const getRowName = (tr) => (tr.querySelector('th div')?.innerText || '').trim();

  // Map page icon to "permitted|restricted", treating inherited as permitted for compare
  const getRowStatus = (tr) => {
    const img = tr.querySelector('td:nth-child(2) img');
    const alt = (img?.alt || '').toLowerCase();
    const src = (img?.getAttribute('src') || '').toLowerCase();
    if (alt.includes('permit') || src.includes('check')) return 'permitted';
    if (alt.includes('inherit') || src.includes('dash')) return 'inherited';
    return 'restricted';
  };

  /* ===========================
     Entitlement detection (patched)
     Priority:
     0) Row checkbox: value -> id (listContainer_ckbox<entitlement>)
     1) Link params (entitlement|entl|privilege|priv|perm|permission|id) or path segment
     2) data-* attributes (data-entitlement|data-privilege-id)
     3) id/class token like "system.user.view"
     4) <code> fallback
  ============================ */
  const getEntitlement = (tr) => {
    const th = tr.querySelector('th') || tr;

    // 0) Checkbox first
    const cb = tr.querySelector('input[type="checkbox"][name="ckbox"]');
    if (cb) {
      const val = cb.value || '';
      if (/\w+\.\w+/.test(val)) return val;
      const m = (cb.id || '').match(/^listContainer_ckbox(.+)$/);
      if (m && /\w+\.\w+/.test(m[1])) return m[1];
    }

    // 1) Links
    const anchors = Array.from(th.querySelectorAll('a[href]'));
    for (const a of anchors) {
      try {
        const u = new URL(a.getAttribute('href'), document.baseURI);
        const keys = Array.from(u.searchParams.keys());
        const k = keys.find(x => /entitlement|entl|privilege|privilegeEntitlement|priv|perm|permission|id/i.test(x));
        if (k) {
          const v = u.searchParams.get(k);
          if (v && /\w+\.\w+/.test(v)) return v;
        }
        const segHit = u.pathname.split('/').find(s => /\w+\.\w+/.test(s));
        if (segHit) return segHit;
      } catch {}
    }

    // 2) data-* attributes
    const dataEl = tr.querySelector('[data-entitlement],[data-privilege-id]');
    const attr = dataEl?.getAttribute('data-entitlement') || dataEl?.getAttribute('data-privilege-id');
    if (attr && /\w+\.\w+/.test(attr)) return attr;

    // 3) id/class tokens
    const pickToken = (s) => (s && (s.match(/[a-z][a-z0-9]*(?:\.[a-z0-9]+){1,}/i) || [])[0]) || null;
    const token = pickToken(tr.id) || pickToken(tr.className) || pickToken(th.id) || pickToken(th.className);
    if (token) return token;

    // 4) <code> fallback
    const code = th.querySelector('code');
    const t = (code?.textContent || '').trim();
    if (/\w+\.\w+/.test(t) && t.length <= 200) return t;

    return null;
  };

  /* ===========================
     Panel UI (minimal, single-line CSS)
  ============================ */
  const ensurePanel = (d) => {
    let p = d.getElementById('cmpPanel');
    if (p) {
      p.querySelector('#roleTypeWarning').textContent = '';
      p.querySelector('#roleDetails').innerHTML = '';
      const f = p.querySelector('#buttonRowFilters'); if (f) { f.innerHTML = ''; f.style.display = 'none'; }
      p.querySelector('#summary').textContent = '';
      p.querySelector('#extras').innerHTML = '';
      return p;
    }
    p = d.createElement('div');
    p.id = 'cmpPanel';
    p.style.cssText = 'position:fixed;top:20px;left:20px;z-index:2147483647;background:#fffbe6;border:3px solid #111;border-radius:8px;padding:12px 12px 10px;min-width:380px;max-height:72vh;overflow:auto;box-shadow:0 6px 18px rgba(0,0,0,.25);font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
    p.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600">Role Privileges Utility</span><button id="cmpClose" class="cmp-btn" style="background:#111;border-color:#111;color:#fff;padding:2px 8px;border:1px solid #111;border-radius:6px;cursor:pointer">✕</button></div>' +
      '<div id="roleTypeWarning" style="color:#b91c1c;margin:4px 0"></div>' +
      '<div id="buttonRowPrimary" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>' +
      '<div id="roleDetails" style="border:1px solid #e5e7eb;background:#ffffff;padding:6px;border-radius:6px;max-height:160px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,&quot;Liberation Mono&quot;,&quot;Courier New&quot;,monospace;font-size:12px;line-height:1.4"></div>' +
      '<div id="buttonRowFilters" style="display:flex;gap:6px;margin-top:6px"></div>' +
      '<div id="summary" style="margin-top:6px"></div>' +
      '<div id="extras" style="margin-top:6px"></div>';
    const st = d.createElement('style');
    st.textContent = '#cmpPanel .cmp-srcline{white-space:pre-wrap;word-break:break-word;}#cmpPanel button.cmp-btn{margin:0;padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #5b21b6;background:#7c3aed;color:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06);}#cmpPanel button.cmp-btn:hover{filter:brightness(1.05);}#cmpPanel .cmp-ent{margin-left:8px;padding:0 6px;font:500 11px/1 monospace;color:#374151;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;vertical-align:baseline;display:inline-block}';
    p.appendChild(st);
    d.body.appendChild(p);
    p.querySelector('#cmpClose').onclick = () => p.remove();
    p.style.left = (d.defaultView.innerWidth - p.offsetWidth) / 2 + 'px';
    return p;
  };

  const toggleEntitlements = (d) => {
    const show = !d.body.dataset._cmpShowEnt;
    d.body.dataset._cmpShowEnt = show ? '1' : '';
    const rows = Array.from(d.querySelectorAll('tbody#listContainer_databody>tr'));
    rows.forEach(tr => {
      const th = tr.querySelector('th');
      if (!th) return;
      let pill = th.querySelector('code.cmp-ent');
      if (show) {
        if (!pill) {
          const ent = getEntitlement(tr);
          if (!ent) return;
          pill = d.createElement('code');
          pill.className = 'cmp-ent';
          pill.textContent = ent;
          // Inline badge style (single-line, safe)
          pill.style.cssText = 'margin-left:8px;padding:0 6px;font:500 11px/1 monospace;color:#374151;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;vertical-align:baseline;display:inline-block';
          (th.querySelector('div') || th).appendChild(pill);
        } else {
          pill.style.display = '';
        }
      } else {
        if (pill) pill.style.display = 'none';
      }
    });
  };

  /* ===========================
     Download JSON (entitlement-keyed)
  ============================ */
  const safeFilename = (s) => String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

  const getBbVersion = (d) => {
    const m = d.querySelector('meta[name="bb-version"]')?.getAttribute('content');
    if (m) return m;
    const ftxt = Array.from(d.querySelectorAll('footer,#pageFooter,.pageFooter'))
      .map(e => e.innerText).join(' ');
    const mm = ftxt.match(/(Build|Version)\s*[:#]?\s*([0-9.]+(?:-[a-z.0-9]+)?)/i);
    return (mm && mm[2]) || undefined;
  };

  const buildDownloadJson = (d) => {
    const rows = Array.from(d.querySelectorAll('tbody#listContainer_databody>tr'));
    const priv = {};
    let miss = 0;
    rows.forEach(tr => {
      const name = getRowName(tr); if (!name) return;
      const raw = getRowStatus(tr);
      const status = raw === 'inherited' ? 'permitted' : raw;
      const ent = getEntitlement(tr);
      if (ent) priv[ent] = { status, name };
      else miss++;
    });
    const data = {
      source: {
        roleType: getPageRoleType(d) || 'System',
        bbDeployment: d.location.host,
        role: getRoleDisplayName(d),
        timestamp: new Date().toISOString(),
        bbVersion: getBbVersion(d) || undefined
      },
      privileges: priv
    };
    return { data, miss };
  };

  const triggerDownload = (d, data) => {
    const rt = data?.source?.roleType || 'Role';
    const rn = data?.source?.role || 'Role';
    const ts = (data?.source?.timestamp || new Date().toISOString()).replace(/[:.]/g, '');
    const fn = `bb_role_${safeFilename(rt)}_${safeFilename(rn)}_${ts}.json`;
    const a = d.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = fn;
    d.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  /* ===========================
     Compare + filters (strict entitlement-keyed)
  ============================ */
  const renderSource = (d, p, j) => {
    const box = p.querySelector('#roleDetails');
    const s = j?.source;
    if (s && typeof s === 'object') {
      box.innerHTML =
        '<div style="font-weight:600;margin-bottom:4px">SOURCE</div>' +
        Object.entries(s).map(([k, v]) =>
          `<div class="cmp-srcline">${esc(k)} = ${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>`
        ).join('');
    } else {
      box.innerHTML = '<div style="font-weight:600;margin-bottom:4px">SOURCE</div>(no "source" object found in JSON)';
    }
  };

  const validateRoleType = (d, p, j) => {
    const pg = (new URLSearchParams(d.location.search).get('type') || '');
    const src = (j?.source?.roleType || '');
    if (pg && src && pg.toLowerCase() !== src.toLowerCase()) {
      const m = `Role type mismatch: JSON is "${j?.source?.roleType}", but this page is "${pg}". Open the correct Manage Privileges page.`;
      p.querySelector('#roleTypeWarning').textContent = m;
      alert('⚠ ' + m);
      return false;
    }
    p.querySelector('#roleTypeWarning').textContent = '';
    return true;
  };

  const isEntitlementKey = (k) => /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/i.test(k);
  const requireEntKeyed = (obj) => {
    const bad = [];
    for (const k in obj) {
      if (!isEntitlementKey(k)) { bad.push(k); if (bad.length >= 5) break; }
    }
    if (bad.length) throw new Error('JSON privileges must be entitlement-keyed. Examples: ' + bad.join(', '));
  };

  // Select-All patch (visible rows only when filters active)
  let saHandler = null;
  const getMasterCB = (d) => d.querySelector('table.list thead input[type="checkbox"]');
  const setSelectAllMode = (d, mode) => {
    const M = getMasterCB(d); if (!M) return;
    if (mode === 'visible') {
      if (!saHandler) {
        saHandler = (ev) => {
          ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation();
          const c = !M.checked; M.checked = c;
          Array.from(d.querySelectorAll('tbody#listContainer_databody>tr'))
            .filter(r => r.style.display !== 'none')
            .forEach(r => { const cb = r.querySelector('input[type="checkbox"]'); if (cb) cb.checked = c; });
        };
        M.dataset._cmpTitle = M.title || '';
      }
      M.title = 'Select only visible rows (filters active)';
      M.addEventListener('click', saHandler, true);
    } else {
      if (saHandler) M.removeEventListener('click', saHandler, true);
      if (M.dataset._cmpTitle !== undefined) { M.title = M.dataset._cmpTitle; delete M.dataset._cmpTitle; }
    }
  };

  const runComparison = (d, p, j) => {
    const rows = Array.from(d.querySelectorAll('tbody#listContainer_databody>tr'));
    const byEnt = j?.privileges || {};
    const pageEnts = new Set();
    let mism = 0, expP = 0, expR = 0;

    rows.forEach(tr => {
      const ent = getEntitlement(tr); if (ent) pageEnts.add(ent);
      const td = tr.querySelector('td:nth-child(2)');
      const raw = getRowStatus(tr);
      const actual = raw === 'inherited' ? 'permitted' : raw;
      const expected = ent ? byEnt[ent]?.status : undefined;
      if (expected === 'permitted') expP++; else if (expected === 'restricted') expR++;

      const old = td?.querySelector('.cmpWarn'); if (old) old.remove();
      if (expected && expected !== actual && td) {
        mism++;
        const s = d.createElement('span');
        s.className = 'cmpWarn';
        s.innerHTML = '⚠';
        s.style.cssText = 'font-size:20px;color:#f1c40f;margin-left:6px;vertical-align:middle;';
        s.title = expected === 'permitted' && actual === 'restricted' ? 'Source is Permitted'
          : expected === 'restricted' && actual === 'permitted' ? 'Source is Restricted'
          : 'Mismatch';
        td.appendChild(s);
      }
    });

    const filters = p.querySelector('#buttonRowFilters');
    const extras = p.querySelector('#extras'); extras.innerHTML = '';
    const msg = d.createElement('div'); msg.style.marginTop = '4px'; extras.appendChild(msg);

    const apply = (mode) => {
      rows.forEach(tr => {
        const ent = getEntitlement(tr);
        const raw = getRowStatus(tr), actual = raw === 'inherited' ? 'permitted' : raw;
        const expected = ent ? byEnt[ent]?.status : undefined;
        const mm = !!(expected && expected !== actual);
        const mp = expected === 'permitted' && actual === 'restricted';
        const mr = expected === 'restricted' && actual === 'permitted';
        let show = true;
        if (mode === 'mismatch') show = mm;
        else if (mode === 'permit') show = mp;
        else if (mode === 'restrict') show = mr;
        else show = true;
        tr.style.display = show ? '' : 'none';
      });
      if (mode === 'all') { setSelectAllMode(d, 'normal'); msg.textContent = ''; }
      else { setSelectAllMode(d, 'visible'); msg.textContent = 'Select All now affects only visible rows.'; }
    };

    filters.innerHTML = '';
    addBtn(d, filters, 'Mismatch', () => apply('mismatch'), 'filterMismatch');
    addBtn(d, filters, 'Permit',   () => apply('permit'),   'filterPermit');
    addBtn(d, filters, 'Restrict', () => apply('restrict'), 'filterRestrict');
    addBtn(d, filters, 'Show All', () => apply('all'),      'filterAll');

    p.querySelector('#summary').innerHTML =
      `Found <b>${mism}</b> mismatches. Expected: <b>${expP}</b> permitted, <b>${expR}</b> restricted.`;

    // Diagnostics (entitlements only)
    const jsonEnts = new Set(Object.keys(byEnt || {}));
    const onlyJson = [...jsonEnts].filter(x => !pageEnts.has(x));
    const onlyPage = [...pageEnts].filter(x => !jsonEnts.has(x));
    const fmt = (arr) => arr.slice(0, 50).map(esc).join(', ') + (arr.length > 50 ? ' …' : '');
    if (onlyJson.length) { const d1 = d.createElement('div'); d1.innerHTML = `**In JSON but not on page (by entitlement, ${onlyJson.length}):** ${fmt(onlyJson)}\n`; extras.appendChild(d1); }
    if (onlyPage.length) { const d2 = d.createElement('div'); d2.innerHTML = `**On page but not in JSON (by entitlement, ${onlyPage.length}):** ${fmt(onlyPage)}\n`; extras.appendChild(d2); }

    alert('JSON uploaded and mismatches flagged.');
  };

  /* ===========================
     Main
  ============================ */
  const { frame, doc } = getDoc();
  if (!onManagePrivileges(doc)) { alert('⚠ Go to the manage privileges page.'); return; }
  if (!isShowAll(doc)) { alert('⚠ Show All is required. Click "Show All" on the page, then re-run.'); return; }

  const panel = ensurePanel(doc);
  const primary = panel.querySelector('#buttonRowPrimary');
  if (!primary.dataset._init) {
    primary.innerHTML = '';

    addBtn(doc, primary, 'Toggle Entitlements', () => { toggleEntitlements(doc); }, 'btnToggleEnt');

    addBtn(doc, primary, 'Download JSON', () => {
      try {
        const { data, miss } = buildDownloadJson(doc);
        const srcLines = Object.entries(data.source)
          .map(([k, v]) => `${k} = ${String(v)}`).join('\n');
        panel.querySelector('#roleDetails').innerHTML = srcLines
          .split('\n').map(line => `<div class="cmp-srcline">${esc(line)}</div>`).join('');
        if (miss) alert(`ℹ ${miss} privilege(s) had no detectable entitlement and were omitted from JSON.`);
        triggerDownload(doc, data);
      } catch (e) { alert('Download failed: ' + (e?.message || e)); }
    }, 'btnDownload');

    addBtn(doc, primary, 'Upload JSON (Compare)', () => {
      const input = doc.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = (ev) => {
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = (e) => {
          let j;
          try { j = JSON.parse(String(e.target.result || '{}')); }
          catch (err) { alert('JSON parse error: ' + (err?.message || err)); return; }
          if (!j || typeof j !== 'object') { alert('JSON must be an object with a "privileges" map.'); return; }
          if (!j.privileges || typeof j.privileges !== 'object') { alert('JSON missing "privileges" object.'); return; }
          try { requireEntKeyed(j.privileges); } catch (err) { alert(err?.message || err); return; }
          if (!validateRoleType(doc, panel, j)) return;
          try { renderSource(doc, panel, j); runComparison(doc, panel, j); }
          catch (err) { console.error(err); alert('Compare failed: ' + (err?.message || err)); }
        };
        r.readAsText(f);
      };
      input.click();
    }, 'btnUpload');

    addBtn(doc, primary, 'Refresh Page', () => { (frame?.contentWindow || window).location.reload(); }, 'btnRefresh');

    primary.dataset._init = '1';
  }
})();
