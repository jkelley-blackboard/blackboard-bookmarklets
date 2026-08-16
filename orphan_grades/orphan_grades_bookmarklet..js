/**
 * Blackboard LMS — Orphan Grade Column Scanner
 * =====================================================
 * Scans a Blackboard course for grade columns that have no
 * corresponding content item in the course content tree.
 *
 * Usage: paste the bookmarklet URL into a browser bookmark,
 * then click it while on any page inside a Blackboard course.
 *
 * Three categories of results:
 *   Orphaned visible   — column exists, no content link, visible in gradebook
 *   Orphaned hidden    — column exists, no content link, hidden from instructor
 *   External item      — column has a broken content ID but matches by name
 *                        (discussions, journals, wikis, LTI items, etc.)
 *
 * APIs used:
 *   Private: /learn/api/v1/courses/{id}/gradebook/columns
 *   Public:  /learn/api/public/v1/courses/{id}/contents
 *
 * Author: Jef Kelley / Blackboard Solutions Engineering
 */

(function () {

  // ── Helpers ──────────────────────────────────────────────────────────────

  const m = location.pathname.match(/courses\/(_\d+_\d+)/);
  if (!m) return alert('Navigate to a Blackboard course page first');

  const cid     = m[1];
  const base    = `${location.origin}/learn/api/v1/courses/${cid}`;
  const pubBase = `${location.origin}/learn/api/public/v1/courses/${cid}`;

  // Skip calculated/system columns
  const skipCol = c =>
    c.calculationType === 'CUSTOM' ||
    c.calculationType === 'CALCULATED' ||
    /^(overall grade|final grade|total|weighted total)/i.test(c.columnName);

  // Human-readable label for the score provider
  const providerLabel = h => ({
    'resource/x-bb-discussion' : 'Discussion',
    'resource/x-bb-journal'    : 'Journal',
    'resource/x-bb-wiki'       : 'Wiki',
    'resource/x-bb-blog'       : 'Blog',
    'resource/x-bb-blti-link'  : 'LTI',
  }[h] || h || 'Unknown');

  // Paginated fetch — handles both private and public API pagination
  async function getAll(url) {
    let r = [], o = 0;
    while (true) {
      const sep = url.includes('?') ? '&' : '?';
      const d   = await fetch(`${url}${sep}limit=200&offset=${o}`).then(x => x.json());
      r = r.concat(d.results || []);
      if (!d.paging?.nextPage || r.length >= (d.paging.count || 0)) break;
      o += 200;
    }
    return r;
  }

  // ── Panel UI ─────────────────────────────────────────────────────────────

  function mkPanel() {
    document.getElementById('bb-orphan-panel')?.remove();
    const el = document.createElement('div');
    el.id = 'bb-orphan-panel';
    el.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'width:420px',
      'max-height:80vh', 'background:#fff', 'border:1px solid #ccc',
      'border-radius:8px', 'box-shadow:0 4px 20px rgba(0,0,0,.2)',
      'z-index:99999', 'font:13px/1.4 system-ui,sans-serif',
      'display:flex', 'flex-direction:column', 'overflow:hidden',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function colRow(c, color) {
    const type = providerLabel(c.scoreProviderHandle);
    const meta = [
      c.id,
      `${c.possible ?? '?'} pts`,
      c.dueDate ? 'Due ' + new Date(c.dueDate).toLocaleDateString() : null,
      c._note,
    ].filter(Boolean).join(' · ');
    return `
      <div style="padding:7px 9px;margin-bottom:4px;border-left:3px solid ${color};background:#fafafa;border-radius:0 4px 4px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px">
          <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1" title="${c.columnName}">${c.columnName}</div>
          <div style="font-size:11px;color:#fff;background:${color};padding:1px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap">${type}</div>
        </div>
        <div style="font-size:11px;color:#888;margin-top:2px">${meta}</div>
      </div>`;
  }

  function section(title, items, color, emptyMsg) {
    return `
      <div style="margin-bottom:14px">
        <div style="font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${color};margin-bottom:5px">${title} (${items.length})</div>
        ${items.length
          ? items.map(c => colRow(c, color)).join('')
          : `<div style="font-size:12px;color:#4caf50">${emptyMsg} ✓</div>`}
      </div>`;
  }

  function render(ov, oh, ex) {
    const panel = mkPanel();
    panel.innerHTML = `
      <div style="background:#1a1a2e;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <strong>Orphan scan — ${cid}</strong>
        <button onclick="document.getElementById('bb-orphan-panel').remove()"
          style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1">&times;</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px 14px;background:#f5f5f5;flex-shrink:0;border-bottom:1px solid #ddd">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:700;color:${ov.length ? '#d9534f' : '#4caf50'}">${ov.length}</div>
          <div style="font-size:11px;color:#666">Orphaned visible</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:700;color:${oh.length ? '#e67e22' : '#4caf50'}">${oh.length}</div>
          <div style="font-size:11px;color:#666">Orphaned hidden</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:700;color:#2196f3">${ex.length}</div>
          <div style="font-size:11px;color:#666">External item</div>
        </div>
      </div>
      <div id="bb-panel-body" style="overflow-y:auto;flex:1;padding:10px 14px"></div>
      <div style="padding:8px 14px;border-top:1px solid #ddd;flex-shrink:0;text-align:right">
        <button id="bb-csv-btn" style="font-size:12px;padding:4px 12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff">Export CSV</button>
      </div>`;

    document.getElementById('bb-panel-body').innerHTML =
      section('Orphaned — visible in gradebook',    ov, '#d9534f', 'None found') +
      section('Orphaned — hidden from gradebook',   oh, '#e67e22', 'None found') +
      section('External gradable item — likely ok', ex, '#2196f3', 'None found');

    document.getElementById('bb-csv-btn').onclick = () => {
      const rows = [['type','column_id','column_name','provider','points','due_date','visible_in_gradebook','note']];
      const add = (type, list) => list.forEach(c => rows.push([
        type, c.id, c.columnName, providerLabel(c.scoreProviderHandle),
        c.possible ?? '', c.dueDate ?? '', c.visibleInBook ? 'yes' : 'no', c._note || '',
      ]));
      add('orphaned_visible', ov);
      add('orphaned_hidden',  oh);
      add('external_linked',  ex);
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'bb_orphan_scan.csv';
      a.click();
    };
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  const panel = mkPanel();
  panel.innerHTML = `
    <div style="padding:20px;text-align:center;color:#666;font:13px system-ui,sans-serif">
      <div style="font-size:15px;font-weight:600;margin-bottom:8px">Scanning gradebook…</div>
      <div id="bb-scan-status">Fetching data…</div>
    </div>`;

  Promise.all([
    getAll(`${base}/gradebook/columns`),
    getAll(`${pubBase}/contents?recursive=true&fields=id,title,parentId,hasGradebookColumns,contentHandler.id,contentHandler.assessmentId,contentHandler.gradeColumnId`),
  ]).then(([cols, contents]) => {

    const byId     = {};
    const titleMap = {};
    contents.forEach(c => {
      byId[c.id] = c;
      if (c.title) titleMap[c.title.trim().toLowerCase()] = c;
    });

    const coveredColIds = new Set(
      contents
        .filter(c => c.hasGradebookColumns && c.contentHandler?.gradeColumnId)
        .map(c => c.contentHandler.gradeColumnId)
    );

    const ov = [], oh = [], ex = [];

    cols.filter(c => !skipCol(c)).forEach(col => {
      // Already linked correctly via content tree
      if (coveredColIds.has(col.id)) return;

      const nameMatch = titleMap[col.columnName.trim().toLowerCase()];

      if (!col.contentId) {
        // No content ID at all — check for name match before calling it orphaned
        if (nameMatch) {
          col._note = `name match → ${nameMatch.id}`;
          ex.push(col);
        } else {
          (col.visibleInBook ? ov : oh).push(col);
        }
        return;
      }

      // Has a contentId but it's not in the content tree
      if (byId[col.contentId]) return; // actually fine — it is in the tree

      if (nameMatch) {
        col._note = `name match → ${nameMatch.id}`;
        ex.push(col);
      } else {
        (col.visibleInBook ? ov : oh).push(col);
      }
    });

    render(ov, oh, ex);

  }).catch(e => {
    const s = document.getElementById('bb-scan-status');
    if (s) s.textContent = 'Error: ' + e.message;
    else console.error(e);
  });

})();
