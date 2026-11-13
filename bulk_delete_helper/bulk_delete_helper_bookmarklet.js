/**
 * Bulk Delete Helper
 *
 * Description: Prepares the course Bulk Delete page in one click: selects every delete option
 *   and types "Delete" in the confirmation box, then shows a panel listing the target course and
 *   each option it selected, so the administrator can review before clicking Submit.
 *   Nothing is submitted by the bookmarklet. Useful when a term purge leaves straggler courses
 *   that won't delete until their content is removed. Based on a bookmarklet by Bradley Lawton,
 *   shared with the Blackboard community.
 * Usage: Administrator Panel > Courses, search for the course, open its menu and choose
 *   Bulk Delete, then activate the bookmarklet on the Bulk Delete page.
 * APIs/Pages: /webapps/blackboard/execute/recycler?course_id={id}&action=select&sourceType=COURSES
 *               (Bulk Delete, an Original admin page inside the Ultra admin iframe)
 *             GET /learn/api/public/v1/courses/{id}?fields=courseId,name (target course)
 * Author: Jeff Kelley / Blackboard Solutions Engineering, from an original by Bradley Lawton
 */
(async function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const getAdminFrameDocument = () => {
    const f = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    return { frame: f, doc: f?.contentDocument ?? null };
  };

  // Ultra publishes its MUI theme as --palette-* custom properties on the top page's :root.
  // Read the resolved values from there (Original admin iframes don't have them) and fall back
  // to Ultra's default theme when a token is missing.
  const getUltraTheme = doc => {
    let cs = null;
    try { cs = window.top.getComputedStyle(window.top.document.documentElement); } catch (e) { /* cross-origin top */ }
    cs = cs || doc.defaultView.getComputedStyle(doc.documentElement);
    const tok = (name, fallback) => {
      const v = cs.getPropertyValue(`--${name}`).trim();
      return v && !/[;{}<>]/.test(v) ? v : fallback;
    };
    return {
      text: tok('palette-text-primary', '#262626'),
      muted: tok('palette-text-secondary', '#666666'),
      bg: tok('palette-background-default', '#ffffff'),
      paper: tok('palette-background-paper', '#f8f8f8'),
      divider: tok('palette-divider', 'rgba(0,0,0,.12)'),
      primary: tok('palette-primary-main', '#262626'),
      primaryHover: tok('palette-primary-light', '#404040'),
      onPrimary: tok('palette-primary-contrastText', '#ffffff'),
      link: tok('palette-link-active', '#2073a1'),
      linkHover: tok('palette-link-hover', '#004270'),
      focus: tok('palette-focus-main', '#006dc7'),
      success: tok('palette-success-main', '#007d2c'),
      warning: tok('palette-warning-dark', 'rgb(142,125,0)'),
      error: tok('palette-error-main', '#c23e37'),
      shadow: tok('shadows-8', '0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12)')
    };
  };

  const ensurePanel = (doc, options = {}) => {
    const panelId = options.id || 'cmpPanel';
    let panel = doc.getElementById(panelId);
    if (panel) {
      const top = panel.querySelector('#pageContextTop');
      const summary = panel.querySelector('#summary');
      if (top) top.innerHTML = '';
      if (summary) summary.textContent = '';
      panel.querySelectorAll('.bdh-extra').forEach(n => n.remove());
      const row = panel.querySelector('#buttonRowPrimary');
      if (row) row.innerHTML = '';
      return panel;
    }
    panel = doc.createElement('div');
    panel.id = panelId;
    // Theme tokens become --bbp-* properties on the panel, so tool markup can use var(--bbp-muted) etc.
    const vars = Object.entries(getUltraTheme(doc)).map(([k, v]) => `--bbp-${k}:${v}`).join(';');
    panel.style.cssText = `${vars};position:fixed;top:20px;left:20px;z-index:2147483647;background:var(--bbp-bg);color:var(--bbp-text);border:1px solid var(--bbp-divider);border-radius:8px;padding:16px;min-width:380px;max-width:min(960px,94vw);max-height:72vh;overflow:auto;box-shadow:var(--bbp-shadow);font:14px/1.43 'Open Sans',sans-serif;text-align:left`;
    const title = options.title || 'Bookmarklet Panel';
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px"><span style="font-weight:600;font-size:16px">${esc(title)}</span><button id="${panelId}-close" class="cmp-close" aria-label="Close">✕</button></div><div id="pageContextTop" style="border:1px solid var(--bbp-divider);background:var(--bbp-paper);padding:8px 12px;border-radius:4px;margin:8px 0;max-height:120px;overflow:auto;font-size:13px"></div><div id="buttonRowPrimary" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"></div><div id="summary" style="margin-top:8px;font-weight:600"></div>`;
    const p = `#${panelId}`;
    const style = doc.createElement('style');
    style.textContent = [
      `${p},${p} *{box-sizing:border-box}`,
      `${p} button{font:inherit}`,
      `${p} button.cmp-btn{margin:0;padding:6px 12px;font-weight:600;line-height:1.43;border-radius:4px;border:1px solid var(--bbp-primary);background:var(--bbp-primary);color:var(--bbp-onPrimary);cursor:pointer}`,
      `${p} button.cmp-btn:hover:not(:disabled){background:var(--bbp-primaryHover)}`,
      `${p} button.cmp-btn-outline{background:transparent;color:var(--bbp-primary)}`,
      `${p} button.cmp-btn-outline:hover:not(:disabled){background:var(--bbp-paper)}`,
      `${p} button.cmp-btn-sm{padding:2px 8px;font-size:12px}`,
      `${p} button:disabled{opacity:.5;cursor:default}`,
      `${p} :focus-visible{outline:2px solid var(--bbp-focus);outline-offset:2px}`,
      `${p} .cmp-close{background:none;border:0;border-radius:4px;padding:4px 8px;font-size:16px;line-height:1;color:var(--bbp-muted);cursor:pointer}`,
      `${p} .cmp-close:hover{background:var(--bbp-paper);color:var(--bbp-text)}`,
      `${p} a.cmp-link{color:var(--bbp-link);font-weight:600;text-decoration:underline;margin-right:12px}`,
      `${p} a.cmp-link:hover{color:var(--bbp-linkHover)}`,
      `${p} .cmp-card{border:1px solid var(--bbp-divider);background:var(--bbp-bg);border-radius:4px;padding:8px 12px;margin:8px 0}`,
      `${p} .cmp-muted{color:var(--bbp-muted);font-size:12px}`,
      `${p} .cmp-mono{font-family:ui-monospace,Consolas,monospace;font-size:11px}`,
      `${p} .cmp-srcline{white-space:pre-wrap;word-break:break-word}`
    ].join('');
    panel.appendChild(style);
    doc.body.appendChild(panel);
    panel.querySelector(`#${panelId}-close`).onclick = () => panel.remove();
    panel.style.left = (doc.defaultView.innerWidth - panel.offsetWidth) / 2 + 'px';
    return panel;
  };

  const addBtn = (doc, wrap, label, fn, id) => {
    const btn = doc.createElement('button');
    btn.textContent = label;
    if (id) btn.id = id;
    btn.className = 'cmp-btn';
    btn.onclick = fn;
    wrap.appendChild(btn);
    return btn;
  };

  // ── Page guard ────────────────────────────────────────────────────────────
  // The Bulk Delete page is an Original admin page inside the Ultra admin iframe:
  //   /webapps/blackboard/execute/recycler?course_id=_123_1&action=select&context=SYSTEM&sourceType=COURSES
  // Require that page and its controls (the option checkboxes and the confirmation box), so the
  // bookmarklet does nothing anywhere else. Fall back to the top document when the page is
  // opened outside the frame.
  const isCorrectPage = d => {
    try {
      return d.location.pathname.includes('/webapps/blackboard/execute/recycler')
        && new URLSearchParams(d.location.search).get('sourceType') === 'COURSES';
    } catch (e) { return false; }
  };
  const hasBulkDeleteControls = d => !!(d && d.querySelector('input[name="selections"]') && d.getElementById('confirmation'));
  const isBulkDeletePage = d => !!d && isCorrectPage(d) && hasBulkDeleteControls(d);
  let { doc } = getAdminFrameDocument();
  if (!isBulkDeletePage(doc)) doc = isBulkDeletePage(document) ? document : null;
  if (!doc) {
    alert('⚠ Please open the course Bulk Delete page first.\n\nAdministrator Panel > Courses, search for the course, open its menu and choose Bulk Delete, then run this bookmarklet again.');
    return;
  }

  // ── Option labels ─────────────────────────────────────────────────────────
  const labelFor = cb => {
    const byFor = cb.id ? doc.querySelector(`label[for="${CSS.escape(cb.id)}"]`) : null;
    const text = (byFor || cb.closest('label') || cb.closest('li, tr, td, div'))?.innerText || '';
    return text.replace(/\s+/g, ' ').trim() || cb.value || '(unlabeled option)';
  };

  // Set a value the way a user would, so any page script listening for input/change sees it.
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const setChecked = (cb, on) => { if (cb.checked !== on) { cb.checked = on; fire(cb, 'change'); } };
  const setValue = (el, v) => { el.value = v; fire(el, 'input'); fire(el, 'change'); };

  // ── Prepare the form ──────────────────────────────────────────────────────
  const boxes = [...doc.querySelectorAll('input[name="selections"]')].filter(cb => !cb.disabled);
  const confirmation = doc.getElementById('confirmation');
  const before = boxes.map(cb => cb.checked);
  const confirmationBefore = confirmation.value;

  boxes.forEach(cb => setChecked(cb, true));
  setValue(confirmation, 'Delete');

  // ── Course context ────────────────────────────────────────────────────────
  // The page URL carries the course's primary key (course_id=_123_1); show the Course ID and
  // name from the REST API so the administrator can confirm the target.
  const pk = new URLSearchParams(doc.location.search).get('course_id');
  let course = null;
  if (/^_\d+_\d+$/.test(pk || '')) {
    try {
      const r = await fetch(`${doc.location.origin}/learn/api/public/v1/courses/${pk}?fields=courseId,name`, { credentials: 'same-origin' });
      if (r.ok) course = await r.json();
      else console.error('Bulk Delete Helper: course lookup returned HTTP', r.status);
    } catch (e) {
      console.error('Bulk Delete Helper: course lookup failed', e);
    }
  }

  // ── Panel ─────────────────────────────────────────────────────────────────
  const panel = ensurePanel(doc, { title: 'Bulk Delete Helper', id: 'bdhPanel' });
  const top = panel.querySelector('#pageContextTop');
  const row = panel.querySelector('#buttonRowPrimary');
  const summary = panel.querySelector('#summary');

  top.innerHTML = course
    ? `<div><b>Course:</b> ${esc(course.courseId)} <span class="cmp-muted">(${esc(pk)})</span></div><div>${esc(course.name)}</div>`
    : `<div><b>Course:</b> ${pk ? esc(pk) : 'not shown in the page address'}</div><div class="cmp-muted">Course name lookup failed. Check the course named on the page before submitting.</div>`;

  // Content areas are listed by their primary key (value _123_1) and labeled with the course's
  // own menu names (Information, Content, or ROOT/INTERACTIVE/INDIRECT in Ultra courses);
  // everything else is a fixed material type such as ANNOUNCMENTS or USERS.
  const isArea = cb => /^_\d+_\d+$/.test(cb.value);
  const areas = boxes.filter(isArea);
  const others = boxes.filter(cb => !isArea(cb));
  const group = (title, items) => items.length
    ? `<div style="font-weight:600;margin:6px 0 2px">${esc(title)} (${items.length})</div>` + items.map(cb => `<div class="cmp-srcline">☑ ${esc(labelFor(cb))}</div>`).join('')
    : '';
  const list = doc.createElement('div');
  list.className = 'cmp-card bdh-extra';
  list.innerHTML = `<div style="font-weight:600;margin-bottom:4px">Selected for deletion (${boxes.length})</div>`
    + group('Content areas', areas)
    + group('Other materials', others);
  row.before(list);

  const usersSelected = others.some(cb => cb.value === 'USERS');
  const note = doc.createElement('div');
  note.className = 'bdh-extra';
  note.style.cssText = 'color:var(--bbp-error);font-weight:600;margin:8px 0';
  note.innerHTML = 'Deleted course content cannot be restored. Try this in a test environment first.'
    + (usersSelected ? '<div style="margin-top:4px">Users is selected: this also removes every enrollment from the course. Untick Users on the page to keep them.</div>' : '');
  row.before(note);

  const credit = doc.createElement('div');
  credit.className = 'cmp-muted bdh-extra';
  credit.style.cssText = 'margin-top:12px';
  credit.textContent = 'Based on a bookmarklet by Bradley Lawton, shared with the Blackboard community.';
  panel.appendChild(credit);

  summary.innerHTML = `<span style="color:var(--bbp-success)">Ready.</span> Review the list, then click <b>Submit</b> at the bottom right of the page to delete. Nothing is deleted until you do.`;

  addBtn(doc, row, 'Undo', () => {
    boxes.forEach((cb, i) => setChecked(cb, before[i]));
    setValue(confirmation, confirmationBefore);
    summary.textContent = 'Selections and confirmation restored to how they were.';
    list.remove();
    note.remove();
  }, 'bdhUndo').classList.add('cmp-btn-outline');

  // Bring the confirmation box and the Submit button into view. Focus stays in the confirmation
  // box, so pressing the Enter key also submits, as in the original bookmarklet.
  confirmation.focus();
  confirmation.scrollIntoView({ block: 'center' });
})();
