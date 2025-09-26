(() => {
  /**************************************************************
   * Helpers
   *************************************************************/
  const getAdminFrameDocument = () => {
    const frame = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    return {
      frame,
      doc: frame?.contentDocument || document,
      win: frame?.contentWindow || window
    };
  };

  const onManagePrivilegesPage = (doc) =>
    doc.location.pathname.includes('/webapps/blackboard/execute/managePrivileges');

  const isShowAll = (doc) => {
    const usp = new URLSearchParams(doc.location.search);
    return usp.get('showAll') === 'true';
  };

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /**************************************************************
   * Panel construction
   *************************************************************/
  const ensurePanel = (doc) => {
    let panel = doc.getElementById('cmpPanel');
    if (panel) {
      // Reset dynamic sections
      panel.querySelector('#paginationWarning').textContent = '';
      panel.querySelector('#roleDetails').innerHTML = '';
      panel.querySelector('#buttonRowFilters').innerHTML = '';
      panel.querySelector('#buttonRowFilters').style.display = 'none';
      panel.querySelector('#summary').textContent = '';
      panel.querySelector('#extras').innerHTML = '';
      return panel;
    }

    panel = doc.createElement('div');
    panel.id = 'cmpPanel';
    panel.style.cssText = [
      'position:fixed',
      'top:20px',
      'left:20px',
      'z-index:2147483647',
      'background:#fffbe6',
      'border:3px solid #111',
      'border-radius:8px',
      'padding:12px 12px 10px',
      'min-width:360px',
      'max-height:72vh',
      'overflow:auto',
      'box-shadow:0 6px 18px rgba(0,0,0,.25)',
      'font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'
    ].join(';');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:8px;">
        <strong>Role Privilege Compare</strong>
        <button id="cmpClose" title="Close"
          style="border:0;background:#6b7280;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer">✕</button>
      </div>

      <div id="paginationWarning" style="color:#b45309;margin:0 0 6px 0;"></div>

      <!-- Row 1: Primary buttons -->
      <div id="buttonRowPrimary" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0"></div>

      <!-- Source details (after JSON upload) -->
      <div id="roleDetails" style="margin:6px 0"></div>

      <!-- Row 2: Filters (after JSON upload) -->
      <div id="buttonRowFilters" style="display:none;flex-wrap:wrap;gap:6px;margin:6px 0"></div>

      <!-- Summary and diagnostics -->
      <div id="summary" style="margin:6px 0;color:#111"></div>
      <div id="extras" style="margin-top:8px"></div>
    `;

    // Styles for buttons and source lines
    const style = doc.createElement('style');
    style.textContent = `
      #cmpPanel .cmp-ttl { font-weight:600; margin-bottom:4px; }
      #cmpPanel .cmp-srclines {
        border:1px solid #e5e7eb; background:#ffffff; padding:6px; border-radius:6px;
        max-height:180px; overflow:auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size:12px; line-height:1.4;
      }
      #cmpPanel .cmp-srcline { white-space:pre-wrap; word-break:break-word; }

      #cmpPanel button.cmp-btn {
        margin:0; padding:6px 10px; font-size:13px; border-radius:6px;
        border:1px solid #5b21b6; background:#7c3aed; color:#fff; cursor:pointer;
        box-shadow:0 1px 2px rgba(0,0,0,.06);
      }
      #cmpPanel button.cmp-btn:hover { filter:brightness(1.05); }
    `;
    panel.appendChild(style);

    // Draggable panel
    ((el) => {
      let dx = 0, dy = 0, sx = 0, sy = 0, dragging = false;
      const onDown = (ev) => { dragging = true; sx = ev.clientX; sy = ev.clientY; ev.preventDefault(); };
      const onMove = (ev) => {
        if (!dragging) return;
        dx = ev.clientX - sx; dy = ev.clientY - sy;
        sx = ev.clientX; sy = ev.clientY;
        el.style.left = (el.offsetLeft + dx) + 'px';
        el.style.top  = (el.offsetTop  + dy) + 'px';
      };
      const onUp = () => { dragging = false; };
      el.addEventListener('mousedown', onDown);
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    })(panel);

    doc.body.appendChild(panel);

    // Close button
    panel.querySelector('#cmpClose').onclick = () => panel.remove();

    // Center horizontally
    panel.style.left = (window.innerWidth - panel.offsetWidth) / 2 + 'px';

    return panel;
  };

  const addButton = (doc, containerEl, label, handler, id) => {
    const b = doc.createElement('button');
    b.textContent = label;
    if (id) b.id = id;
    b.className = 'cmp-btn';
    b.onclick = handler;
    containerEl.appendChild(b);
  };

  /**************************************************************
   * Blackboard table parsing
   *************************************************************/
  const getRowName = (tr) => (tr.querySelector('th div')?.innerText || '').trim();

  const getActualStatus = (tr) => {
    // Second column contains status icon (checkmark / dash / nothing)
    const img = tr.querySelector('td:nth-child(2) img');
    const alt = (img?.alt || '').toLowerCase();
    const src = (img?.getAttribute('src') || '').toLowerCase();

    if (alt.includes('permit') || src.includes('check')) return 'permitted';
    if (alt.includes('inherit') || src.includes('dash'))  return 'inherited';
    return 'restricted';
  };

  const warningIcon = (doc) => {
    const s = doc.createElement('span');
    s.innerHTML = '⚠';
    s.style.cssText = 'font-size:20px;color:#f1c40f;margin-left:6px;vertical-align:middle;';
    return s;
  };

  /**************************************************************
   * Render: SOURCE section ("key = value" per line)
   *************************************************************/
  const renderSourceLines = (doc, panel, data) => {
    const roleDetails = panel.querySelector('#roleDetails');

    const hasSrc = Object.prototype.hasOwnProperty.call(data, 'source');
    const src = hasSrc ? data.source : undefined;

    if (src && typeof src === 'object') {
      const linesHtml = Object.entries(src)
        .map(([k, v]) => `<div class="cmp-srcline">${esc(k)} = ${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>`)
        .join('');

      roleDetails.innerHTML = `
        <div class="cmp-ttl">SOURCE</div>
        <div class="cmp-srclines">${linesHtml || '<em>(empty)</em>'}</div>
      `;
    } else {
      roleDetails.innerHTML = `
        <div class="cmp-ttl">SOURCE</div>
        <em>(no "source" object found in JSON)</em>
      `;
    }
  };

  /**************************************************************
   * Comparison + Filters
   *************************************************************/
  const runComparison = (doc, panel, data) => {
    const rows = Array.from(doc.querySelectorAll('tbody#listContainer_databody>tr'));
    const pageNames = new Set();
    let mismatches = 0, expectedPermitted = 0, expectedRestricted = 0;

    // Pass 1: annotate mismatches with icon (no row highlighting)
    rows.forEach((tr) => {
      const name = getRowName(tr);
      if (!name) return;

      pageNames.add(name);

      const td2 = tr.querySelector('td:nth-child(2)');
      const actualRaw = getActualStatus(tr);
      const actualForCompare = (actualRaw === 'inherited') ? 'permitted' : actualRaw;

      const expected = data.privileges?.[name]?.status;

      // Count expected for summary
      if (expected === 'permitted') expectedPermitted++;
      else if (expected === 'restricted') expectedRestricted++;

      // Remove any previous icon
      const old = td2?.querySelector('.cmpWarn');
      if (old) old.remove();

      if (expected && expected !== actualForCompare && td2) {
        mismatches++;
        const mark = warningIcon(doc);
        mark.className = 'cmpWarn';

        // Specialized tooltip text
        if (expected === 'permitted' && actualForCompare === 'restricted') {
          mark.title = 'Source is Permitted';
        } else if (expected === 'restricted' && actualForCompare === 'permitted') {
          mark.title = 'Source is Restricted';
        } else {
          mark.title = 'Mismatch';
        }

        td2.appendChild(mark);
      }
    });

    // Filters
    const filtersRow = panel.querySelector('#buttonRowFilters');
    const applyFilter = (mode) => {
      rows.forEach((tr) => {
        const name = getRowName(tr);
        const expected = data.privileges?.[name]?.status;
        const actualRaw = getActualStatus(tr);
        const actualForCompare = (actualRaw === 'inherited') ? 'permitted' : actualRaw;

        const anyMismatch = !!(expected && expected !== actualForCompare);
        const mismatchPermit   = (expected === 'permitted' && actualForCompare === 'restricted');
        const mismatchRestrict = (expected === 'restricted' && actualForCompare === 'permitted');

        let show = true;
        if (mode === 'mismatch')  show = anyMismatch;
        else if (mode === 'permit')   show = mismatchPermit;
        else if (mode === 'restrict') show = mismatchRestrict;
        else if (mode === 'all')      show = true;

        tr.style.display = show ? '' : 'none';
      });
    };

    filtersRow.innerHTML = '';
    addButton(doc, filtersRow, 'Mismatch', () => applyFilter('mismatch'), 'filterMismatch');
    addButton(doc, filtersRow, 'Permit',   () => applyFilter('permit'),   'filterPermit');
    addButton(doc, filtersRow, 'Restrict', () => applyFilter('restrict'), 'filterRestrict');
    addButton(doc, filtersRow, 'Show All', () => applyFilter('all'),      'filterAll');
    filtersRow.style.display = 'flex';

    // Summary
    panel.querySelector('#summary').innerHTML =
      `Found <b>${mismatches}</b> mismatches. Expected: <b>${expectedPermitted}</b> permitted, <b>${expectedRestricted}</b> restricted.`;

    // Diagnostics
    const extras = panel.querySelector('#extras');
    const jsonNames = new Set(Object.keys(data.privileges || {}));
    const onlyJson = [...jsonNames].filter(x => !pageNames.has(x));
    const onlyPage = [...pageNames].filter(x => !jsonNames.has(x));

    const fmtList = (arr) =>
      arr.slice(0, 50).map(x => `<code>${esc(x)}</code>`).join(', ') + (arr.length > 50 ? ' …' : '');

    extras.innerHTML = '';
    if (onlyJson.length) {
      const div = doc.createElement('div');
      div.innerHTML = `<div style="margin-top:6px"><b>In JSON but not on page (${onlyJson.length}):</b> ${fmtList(onlyJson)}</div>`;
      extras.appendChild(div);
    }
    if (onlyPage.length) {
      const div2 = doc.createElement('div');
      div2.innerHTML = `<div style="margin-top:6px"><b>On page but not in JSON (${onlyPage.length}):</b> ${fmtList(onlyPage)}</div>`;
      extras.appendChild(div2);
    }

    alert('JSON uploaded and mismatches flagged.');
  };

  /**************************************************************
   * Main
   *************************************************************/
  const { frame, doc, win } = getAdminFrameDocument();

  // 1) Validate page
  if (!onManagePrivilegesPage(doc)) {
    alert('⚠ Go to the manage privileges page of a system or course role.');
    return;
  }

  // 2) Do NOT auto-expand paging: Show warning and exit if not showAll
  if (!isShowAll(doc)) {
    alert('⚠ Show All is required. Click "Show All" on the page, then re-run this bookmarklet.');
    return;
  }

  // 3) Build the panel
  const panel = ensurePanel(doc);

  // 4) Build the top row (Upload JSON, Refresh Page) once
  const primaryRow = panel.querySelector('#buttonRowPrimary');
  if (!primaryRow.dataset._init) {
    primaryRow.innerHTML = '';

    // Upload JSON button
    addButton(doc, primaryRow, 'Upload JSON', () => {
      const input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(String(e.target.result || '{}'));
            if (!data || typeof data !== 'object') throw new Error('Invalid format');

            // SOURCE lines under top row
            renderSourceLines(doc, panel, data);

            // Compare and show filters
            runComparison(doc, panel, data);
          } catch {
            alert('Invalid JSON file or structure.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }, 'btnUpload');

    // Refresh Page button
    addButton(doc, primaryRow, 'Refresh Page', () => {
      (frame?.contentWindow || window).location.reload();
    }, 'btnRefresh');

    primaryRow.dataset._init = '1';
  }
})();
