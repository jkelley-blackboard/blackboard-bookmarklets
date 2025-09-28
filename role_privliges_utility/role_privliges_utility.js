javascript:(() => {
  /* ===========================
     Page/iframe helpers
     ============================ */
  const getDoc = () => {
    const f = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    return {
      frame: f,
      doc: f?.contentDocument || document,
      win: f?.contentWindow || window
    };
  };
  const onManagePrivileges = (d) =>
    d.location.pathname.includes('/webapps/blackboard/execute/managePrivileges');
  const isShowAll = (d) =>
    new URLSearchParams(d.location.search).get('showAll') === 'true';

  /* ===========================
     Utilities
     ============================ */
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const getListBody = (d) =>
    d.getElementById('listContainer_databody') ||
    d.querySelector('#listContainer_databody');

  const getListTable = (d) => {
    const tbody = getListBody(d);
    if (!tbody) return { tbody: null, table: null };
    const table = tbody.closest('table');
    return { tbody, table };
  };

  // Only TRs from #listContainer_databody
  const getRows = (d) => {
    const { tbody } = getListTable(d);
    if (!tbody) return [];
    return Array.from(tbody.rows || tbody.querySelectorAll('tr'))
      .filter(tr => tr.querySelector('th,td'));
  };

  const safeFilename = (s) =>
    String(s).replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ===========================
     Page context (shown at panel top)
     ============================ */
  const getPageContext = (doc) => {
    const host = doc.location.host || '';
    const roleType = new URLSearchParams(doc.location.search).get('type') || '';
    const rawTitle = doc.querySelector('#pageTitleText')?.textContent.trim() || '';
    const i = rawTitle.indexOf(':') >= 0 ? rawTitle.indexOf(':') : rawTitle.indexOf('：');
    const role = i >= 0 ? rawTitle.slice(i + 1).trim() : '';
    const baseHref = document.querySelector('base')?.getAttribute('href') || '';
    const bbVersion = baseHref.includes('/uiv') ? baseHref.split('/uiv')[1] : '';
    return (!host || !roleType || !role)
      ? null
      : { host, roleType, role, bbVersion };
  };

  /* ===========================
     Row reader (single source of truth)
     ============================ */
  // Name that ignores the entitlement pill and compare markers
  const getCleanHeaderText = (th) => {
    if (!th) return null;
    const clone = th.cloneNode(true);
    clone.querySelectorAll('code.cmp-ent, .cmp-ent, .cmpWarn').forEach(el => el.remove());
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text || null;
  };

  function readRow(tr) {
    const entitlement =
      tr.querySelector('td input[type="checkbox"]')?.value
      || tr.querySelector('td:nth-child(1) input[type="checkbox"]')?.value
      || null;

    const th = tr.querySelector('th');
    const name = getCleanHeaderText(th);
    if (!entitlement || !name) return null;

    const td2 = tr.querySelector('td:nth-child(2)') || tr.querySelector('td:nth-of-type(2)');
    let status = 'restricted';
    if (td2) {
      const icon = td2.querySelector('img, .icon, i, svg, [aria-label]');
      const token = [
        (icon?.getAttribute?.('src') || ''),
        (icon?.getAttribute?.('class') || ''),
        (icon?.getAttribute?.('alt') || ''),
        (icon?.getAttribute?.('title') || ''),
        (icon?.getAttribute?.('aria-label') || ''),
        (td2.getAttribute?.('title') || '')
      ].join(' ').toLowerCase();
      if (token.includes('check') || token.includes('tick') || token.includes('permit')) {
        status = 'permitted';
      } else if (token.includes('dash') || token.includes('inherit')) {
        status = 'inherited';
      } else if (token.includes('restrict') || token.includes('lock')) {
        status = 'restricted';
      } else {
        const anyImg = td2.querySelector('img');
        if (anyImg) {
          const src = (anyImg.getAttribute('src') || '').toLowerCase();
          if (src.includes('check')) status = 'permitted';
          else if (src.includes('dash')) status = 'inherited';
        }
      }
    }
    return { entitlement, name, status };
  }

  /* ===========================
     UI helpers
     ============================ */
  const addBtn = (d, wrap, label, fn, id) => {
    const b = d.createElement('button');
    b.textContent = label;
    if (id) b.id = id;
    b.className = 'cmp-btn';
    b.onclick = fn;
    wrap.appendChild(b);
  };

  const ensurePanel = (d) => {
    let p = d.getElementById('cmpPanel');
    if (p) {
      // Reset dynamic sections
      p.querySelector('#roleTypeWarning').textContent = '';
      p.querySelector('#pageContextTop').innerHTML = '';
      p.querySelector('#roleDetails').innerHTML = '';
      const f = p.querySelector('#buttonRowFilters');
      if (f) { f.innerHTML = ''; f.style.display = 'none'; }
      p.querySelector('#summary').textContent = '';
      p.querySelector('#extras').innerHTML = '';
      return p;
    }
    p = d.createElement('div');
    p.id = 'cmpPanel';
    p.style.cssText =
      'position:fixed;top:20px;left:20px;z-index:2147483647;background:#fffbe6;border:3px solid #111;border-radius:8px;padding:12px;min-width:380px;max-height:72vh;overflow:auto;box-shadow:0 6px 18px rgba(0,0,0,.25);font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
    p.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-weight:600">Role Privileges Utility</span><button id="cmpClose" class="cmp-btn" style="background:#111;color:#fff;padding:2px 8px;border-radius:6px">✕</button></div>' +
      // Top-of-panel page context
      '<div id="pageContextTop" style="border:1px solid #e5e7eb;background:#fff;padding:6px;border-radius:6px;margin:6px 0;max-height:120px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\'Liberation Mono\',\'Courier New\',monospace;font-size:12px;line-height:1.35"></div>' +
      '<div id="roleTypeWarning" style="color:#b91c1c;margin:4px 0"></div>' +
      '<div id="buttonRowPrimary" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>' +
      '<div id="roleDetails" style="border:1px solid #e5e7eb;background:#ffffff;padding:6px;border-radius:6px;max-height:160px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\'Liberation Mono\',\'Courier New\',monospace;font-size:12px;line-height:1.4"></div>' +
      '<div id="buttonRowFilters" style="display:none;gap:6px;margin-top:6px"></div>' +
      '<div id="summary" style="margin-top:6px"></div>' +
      '<div id="extras" style="margin-top:6px"></div>';
    const st = d.createElement('style');
    st.textContent =
      '#cmpPanel .cmp-srcline{white-space:pre-wrap;word-break:break-word;}#cmpPanel button.cmp-btn{margin:0;padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #5b21b6;background:#7c3aed;color:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06);}#cmpPanel button.cmp-btn:hover{filter:brightness(1.05);}#cmpPanel .cmp-ent{margin-left:8px;padding:0 6px;font:500 11px/1 monospace;color:#374151;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;vertical-align:baseline;display:inline-block}';
    p.appendChild(st);
    d.body.appendChild(p);
    p.querySelector('#cmpClose').onclick = () => p.remove();
    p.style.left = (d.defaultView.innerWidth - p.offsetWidth) / 2 + 'px';
    return p;
  };

  // Render getPageContext() at top of panel
  const renderPageContext = (d, p) => {
    const box = p.querySelector('#pageContextTop');
    const ctx = getPageContext(d);
    if (!box) return;
    if (!ctx) {
      box.innerHTML =
        '<div style="font-weight:600;margin-bottom:4px">PAGE CONTEXT</div>(unavailable on this page)';
      return;
    }
    box.innerHTML =
      '<div style="font-weight:600;margin-bottom:4px">PAGE CONTEXT</div>' +
      Object.entries(ctx)
        .map(([k, v]) =>
          `<div class="cmp-srcline">${esc(k)} = ${esc(
            typeof v === 'object' ? JSON.stringify(v) : String(v)
          )}</div>`
        )
        .join('');
  };

  const toggleEntitlements = (d) => {
    const show = !d.body.dataset._cmpShowEnt;
    d.body.dataset._cmpShowEnt = show ? '1' : '';
    const rows = getRows(d);
    if (!rows.length && show) {
      alert('No privilege rows found inside #listContainer_databody. Is "Show All" enabled?');
      return;
    }
    rows.forEach((tr) => {
      const th = tr.querySelector('th');
      if (!th) return;
      let pill = th.querySelector('code.cmp-ent');
      if (show) {
        if (!pill) {
          const r = readRow(tr);
          if (!r) return;
          pill = d.createElement('code');
          pill.className = 'cmp-ent';
          pill.textContent = r.entitlement;
          pill.style.cssText =
            'margin-left:8px;padding:0 6px;font:500 11px/1 monospace;color:#374151;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;vertical-align:baseline;display:inline-block';
          (th.querySelector('div, a, span') || th).appendChild(pill);
        } else {
          pill.style.display = '';
        }
      } else if (pill) {
        pill.style.display = 'none';
      }
    });
  };

  /* ===========================
     Download JSON (pretty-printed)
     ============================ */
  const buildDownloadJson = (d) => {
    const rows = getRows(d);
    const priv = {};
    let miss = 0;
    rows.forEach((tr) => {
      const r = readRow(tr);
      if (!r) { miss++; return; }
      const { entitlement, name, status } = r;
      priv[entitlement] = { status, name };
    });
    const ctx = getPageContext(d) || {};
    const nowIso = new Date().toISOString(); // Always use now for JSON
    const data = {
      source: {
        roleType: ctx.roleType || 'System',
        bbDeployment: ctx.host || d.location.host,
        role: ctx.role || '',
        timestamp: nowIso,
        bbVersion: ctx.bbVersion || undefined
      },
      privileges: priv
    };
    return { data, miss };
  };

  const triggerDownload = (d, data) => {
    const rt = data?.source?.roleType || 'Role';
    const rn = data?.source?.role || 'Role';
    const tsRaw = data?.source?.timestamp || new Date().toISOString();
    const ts = tsRaw.replace(/[:.TZ-]/g, '').slice(0, 14);
    const fn = `bb_role_${safeFilename(rt)}_${safeFilename(rn)}_${ts}.json`;

    // Pretty-print the JSON for readability (+ newline)
    const pretty = JSON.stringify(data, null, 2) + '\n';

    const a = d.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([pretty], { type: 'application/json' })
    );
    a.download = fn;
    d.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  /* ===========================
     Compare + filters
     ============================ */
  const renderSource = (d, p, j) => {
    const box = p.querySelector('#roleDetails');
    const s = j?.source;
    if (s && typeof s === 'object') {
      box.innerHTML =
        '<div style="font-weight:600;margin-bottom:4px">SOURCE</div>' +
        Object.entries(s)
          .map(([k, v]) =>
            `<div class="cmp-srcline">${esc(k)} = ${esc(
              typeof v === 'object' ? JSON.stringify(v) : String(v)
            )}</div>`
          )
          .join('');
    } else {
      box.innerHTML =
        '<div style="font-weight:600;margin-bottom:4px">SOURCE</div>(no "source" object found in JSON)';
    }
  };

  const validateRoleType = (d, p, j) => {
    const pg = new URLSearchParams(d.location.search).get('type') || '';
    const src = j?.source?.roleType || '';
    if (pg && src && pg.toLowerCase() !== src.toLowerCase()) {
      const m = `Role type mismatch: JSON is "${j?.source?.roleType}", but this page is "${pg}". Open the correct Manage Privileges page.`;
      p.querySelector('#roleTypeWarning').textContent = m;
      alert('⚠ ' + m);
      return false;
    }
    p.querySelector('#roleTypeWarning').textContent = '';
    return true;
  };

  // NOTE: entitlement key validation removed per request

  // Select-All patch (scoped to the table that owns #listContainer_databody)
  let saHandler = null;
  const getMasterCB = (d) => {
    const { table } = getListTable(d);
    if (!table) return null;
    return table.querySelector('thead input[type="checkbox"]');
  };
  const setSelectAllMode = (d, mode) => {
    const M = getMasterCB(d);
    if (!M) return;
    if (mode === 'visible') {
      if (!saHandler) {
        saHandler = (ev) => {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          ev.stopPropagation();
          const c = !M.checked;
          M.checked = c;
          getRows(d)
            .filter((r) => r.style.display !== 'none')
            .forEach((r) => {
              const cb = r.querySelector('input[type="checkbox"]');
              if (cb) cb.checked = c;
            });
        };
        M.dataset._cmpTitle = M.title || '';
      }
      M.title = 'Select only visible rows (filters active)';
      M.addEventListener('click', saHandler, true);
    } else {
      if (saHandler) M.removeEventListener('click', saHandler, true);
      if (M.dataset._cmpTitle !== undefined) {
        M.title = M.dataset._cmpTitle;
        delete M.dataset._cmpTitle;
      }
    }
  };

  const runComparison = (d, p, j) => {
    const rows = getRows(d);
    const byEnt = j?.privileges || {};
    const pageEnts = new Set();
    let mism = 0, expP = 0, expR = 0;

    rows.forEach((tr) => {
      const r = readRow(tr);
      if (!r) return;

      const ent = r.entitlement;
      pageEnts.add(ent);

      const td = tr.querySelector('td:nth-child(2)');
      const raw = r.status;
      const actual = raw === 'inherited' ? 'permitted' : raw;
      const expected = byEnt[ent]?.status;

      if (expected === 'permitted') expP++;
      else if (expected === 'restricted') expR++;

      const old = td?.querySelector('.cmpWarn');
      if (old) old.remove();

      if (expected && expected !== actual && td) {
        mism++;
        const s = d.createElement('span');
        s.className = 'cmpWarn';
        s.innerHTML = '⚠';
        s.style.cssText =
          'font-size:20px;color:#f1c40f;margin-left:6px;vertical-align:middle;';
        s.title =
          expected === 'permitted' && actual === 'restricted'
            ? 'Source is Permitted'
            : expected === 'restricted' && actual === 'permitted'
            ? 'Source is Restricted'
            : 'Mismatch';
        td.appendChild(s);
      }
    });

    const filters = p.querySelector('#buttonRowFilters');
    const extras = p.querySelector('#extras');
    extras.innerHTML = '';

    const msg = d.createElement('div');
    msg.style.marginTop = '4px';
    extras.appendChild(msg);

    const apply = (mode) => {
      rows.forEach((tr) => {
        const r = readRow(tr);
        if (!r) {
          tr.style.display = mode === 'all' ? '' : 'none';
          return;
        }
        const raw = r.status;
        const actual = raw === 'inherited' ? 'permitted' : raw;
        const expected = byEnt[r.entitlement]?.status;

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
      if (mode === 'all') {
        setSelectAllMode(d, 'normal');
        msg.textContent = '';
      } else {
        setSelectAllMode(d, 'visible');
        msg.textContent = 'Select All now affects only visible rows.';
      }
    };

    filters.innerHTML = '';
    filters.style.display = 'flex';
    addBtn(d, filters, 'Mismatch', () => apply('mismatch'), 'filterMismatch');
    addBtn(d, filters, 'Permit', () => apply('permit'), 'filterPermit');
    addBtn(d, filters, 'Restrict', () => apply('restrict'), 'filterRestrict');
    addBtn(d, filters, 'Show All', () => apply('all'), 'filterAll');

    p.querySelector('#summary').innerHTML =
      `Found <b>${mism}</b> mismatches. Expected: <b>${expP}</b> permitted, <b>${expR}</b> restricted.`;

    // Diagnostics (entitlements only)
    const jsonEnts = new Set(Object.keys(byEnt || {}));
    const onlyJson = [...jsonEnts].filter((x) => !pageEnts.has(x));
    const onlyPage = [...pageEnts].filter((x) => !jsonEnts.has(x));
    const fmt = (arr) =>
      arr.slice(0, 50).map(esc).join(', ') + (arr.length > 50 ? ' …' : '');
    if (onlyJson.length) {
      const d1 = d.createElement('div');
      d1.innerHTML = `**In JSON but not on page (by entitlement, ${onlyJson.length}):** ${fmt(onlyJson)}\n`;
      extras.appendChild(d1);
    }
    if (onlyPage.length) {
      const d2 = d.createElement('div');
      d2.innerHTML = `**On page but not in JSON (by entitlement, ${onlyPage.length}):** ${fmt(onlyPage)}\n`;
      extras.appendChild(d2);
    }

    alert('JSON uploaded and mismatches flagged.');
  };

  /* ===========================
     Main
     ============================ */
  const { frame, doc } = getDoc();
  if (!onManagePrivileges(doc)) {
    alert('⚠ Go to the manage privileges page.');
    return;
  }
  if (!isShowAll(doc)) {
    alert('⚠ Show All is required. Click "Show All" on the page, then re-run.');
    return;
  }

  const panel = ensurePanel(doc);
  // Populate PAGE CONTEXT immediately
  renderPageContext(doc, panel);

  const primary = panel.querySelector('#buttonRowPrimary');

  if (!primary.dataset._init) {
    primary.innerHTML = '';

    addBtn(doc, primary, 'Toggle Entitlements', () => {
      toggleEntitlements(doc);
    }, 'btnToggleEnt');

    addBtn(doc, primary, 'Download JSON', () => {
      try {
        const { data, miss } = buildDownloadJson(doc);
        // Show the SOURCE block (what will be in the JSON header)
        const srcLines = Object.entries(data.source)
          .map(([k, v]) => `${k} = ${String(v)}`)
          .join('\n');
        panel.querySelector('#roleDetails').innerHTML = srcLines
          .split('\n')
          .map((line) => `<div class="cmp-srcline">${esc(line)}</div>`)
          .join('');
        if (miss) alert(`ℹ ${miss} row(s) had no detectable entitlement/name and were omitted from JSON.`);
        triggerDownload(doc, data);
      } catch (e) {
        alert('Download failed: ' + (e?.message || e));
      }
    }, 'btnDownload');

    addBtn(doc, primary, 'Upload JSON (Compare)', () => {
      const input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (e) => {
          let j;
          try {
            j = JSON.parse(String(e.target.result || '{}'));
          } catch (err) {
            alert('JSON parse error: ' + (err?.message || err));
            return;
          }
          if (!j || typeof j !== 'object') {
            alert('JSON must be an object with a "privileges" map.');
            return;
          }
          if (!j.privileges || typeof j.privileges !== 'object') {
            alert('JSON missing "privileges" object.');
            return;
          }
          if (!validateRoleType(doc, panel, j)) return;
          try {
            renderSource(doc, panel, j);
            runComparison(doc, panel, j);
          } catch (err) {
            console.error(err);
            alert('Compare failed: ' + (err?.message || err));
          }
        };
        r.readAsText(f);
      };
      input.click();
    }, 'btnUpload');

    addBtn(doc, primary, 'Refresh Page', () => {
      (frame?.contentWindow || window).location.reload();
    }, 'btnRefresh');

    primary.dataset._init = '1';
  }
})();
