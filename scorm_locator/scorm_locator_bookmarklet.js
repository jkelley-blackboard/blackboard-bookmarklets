/**
 * SCORM Package Locator
 *
 * Description: Finds every SCORM item in a Blackboard LMS Ultra course and lists, for each one,
 *   a link to the Content Collection folder that holds its unpacked package files, a preview
 *   link, and a one-click zip download of the package (the same zip Download Package builds),
 *   to recover a package when the original .zip is lost or confirm which version is running.
 * Usage: Open any page inside a Blackboard LMS Ultra course (URL contains /ultra/courses/_123_1),
 *   then activate the bookmarklet. Requires a System Admin account to open the folder links.
 * APIs/Pages: GET /learn/api/public/v1/courses/{id}
 *             GET /learn/api/public/v1/courses/{id}/contents?recursive=true
 *             GET /learn/api/public/v1/courses/{id}/contents/{contentId}/children (fallback walk)
 *             GET /learn/api/v1/courses/{id}/contents/{contentId} (private; SCORM launch URL)
 *             /ultra/courses/{id}/scorm/launchFrame (preview)
 *             GET  /webapps/cmsmain/webui/internal/courses/{Course ID}/content/{contentId} (folder + nonce)
 *             POST /webapps/cmsmain/webui/internal/courses/{Course ID}/content/{contentId}.zip (download)
 *             /webapps/cmsmain/webui/internal/courses/{Course ID}/content/{contentId}
 * Author: Jeff Kelley / Blackboard Solutions Engineering
 */
(async function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

  // ── Page Guard ────────────────────────────────────────────────────────────
  const courseMatch = location.pathname.match(/\/ultra\/courses\/(_\d+_\d+)/);
  if (!courseMatch) {
    alert('⚠ Please open a Blackboard LMS Ultra course first (the URL should contain /ultra/courses/_123_1).');
    return;
  }
  const coursePk = courseMatch[1];
  const origin = location.origin;
  const api = `${origin}/learn/api/public/v1/courses/${coursePk}`;
  const FIELDS = 'id,parentId,title,contentHandler,availability';

  const isScorm = item => /scorm/i.test(item.contentHandler?.id || '');

  // ── Fetch Helpers ─────────────────────────────────────────────────────────
  async function getJson(url) {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  }

  async function getAllPages(firstUrl) {
    const out = [];
    let url = firstUrl;
    while (url) {
      const d = await getJson(url);
      out.push(...(d.results || []));
      url = d.paging?.nextPage ? origin + d.paging.nextPage : null;
    }
    return out;
  }

  // One recursive call when the API supports it; otherwise walk folder by folder.
  async function getAllContents() {
    try {
      return await getAllPages(`${api}/contents?recursive=true&fields=${FIELDS}&limit=200`);
    } catch (e) {
      console.error('SCORM Locator: recursive contents call failed, walking folders instead.', e);
    }
    const all = [];
    const queue = [null];
    while (queue.length) {
      const parent = queue.shift();
      const url = parent ? `${api}/contents/${parent}/children?fields=${FIELDS},hasChildren&limit=200` : `${api}/contents?fields=${FIELDS},hasChildren&limit=200`;
      let items;
      try {
        items = await getAllPages(url);
      } catch (e) {
        console.error(`SCORM Locator: could not list children of ${parent}`, e);
        continue;
      }
      items.forEach(it => {
        if (!it.parentId && parent) it.parentId = parent;
        all.push(it);
        if (it.hasChildren) queue.push(it.id);
      });
    }
    return all;
  }

  // The SCORM engine's launch URL includes a tenant-specific plugin handle, so read it from the
  // item (private API) and wrap it the way Ultra's launchFrame expects: "/" becomes "~2F" and the
  // rest is URI-encoded except ":". Never write literal percent-escapes here (bookmarks decode them).
  async function getPreviewUrl(contentId) {
    try {
      const d = await getJson(`${origin}/learn/api/v1/courses/${coursePk}/contents/${contentId}`);
      const launch = Object.values(d.contentDetail || {}).find(v => v?.launchUrl)?.launchUrl;
      if (!launch) return '';
      const abs = new URL(launch, origin).href + '&from_ultra=true';
      const encColon = encodeURIComponent(':');
      const toolHref = abs.split('/').map(s => encodeURIComponent(s).split(encColon).join(':')).join('~2F');
      return `${origin}/ultra/courses/${coursePk}/scorm/launchFrame?toolHref=${toolHref}&courseId=${coursePk}&contentId=${contentId}`;
    } catch (e) {
      console.error(`SCORM Locator: no launch URL for ${contentId}`, e);
      return '';
    }
  }

  // ── Package Download ──────────────────────────────────────────────────────
  // Mirrors the Content Collection's Download Package action: read the folder page's filesForm
  // (its nonce is single-use, so fetch it fresh each time), tick every entry, and POST it to
  // "<folder>.zip". Needs Content Collection access to the course's internal area (System Admin).
  async function readFilesForm(folderUrl) {
    const page = await fetch(folderUrl, { credentials: 'same-origin' });
    if (!page.ok) throw new Error(`HTTP ${page.status} opening the package folder`);
    return new DOMParser().parseFromString(await page.text(), 'text/html').getElementById('filesForm');
  }

  async function canOpenFolder(folderUrl) {
    try {
      return !!(await readFilesForm(folderUrl));
    } catch (e) {
      console.error('SCORM Locator: Content Collection access check failed', e);
      return false;
    }
  }

  const safeName = s => String(s).replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

  async function downloadPackage(row, courseId) {
    const form = await readFilesForm(row.folderUrl);
    if (!form) throw new Error('package folder not available (Content Collection access to the internal area is required)');
    const body = new URLSearchParams();
    let entries = 0;
    form.querySelectorAll('input[name]').forEach(el => {
      if (el.type === 'hidden') body.append(el.name, el.value);
      else if (el.type === 'checkbox' && /^file\d+$/.test(el.name)) { body.append(el.name, el.value); entries++; }
    });
    if (!entries) throw new Error('package folder is empty');
    body.set('a1', 'download');
    body.set('subaction', 'zip');
    const r = await fetch(`${row.folderUrl}.zip`, { method: 'POST', credentials: 'same-origin', body });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !/zip|octet-stream/i.test(type)) throw new Error(`download failed (HTTP ${r.status}, ${type || 'no content type'})`);
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName(courseId)}_${safeName(row.title)}_${row.id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return blob.size;
  }

  // ── Role Guard ────────────────────────────────────────────────────────────
  // Students (including the Student Preview user) must not get Preview links: launching records a
  // SCORM attempt for them. Check the caller's own course membership before anything else runs.
  // Admins are usually not enrolled, which returns 404 and is allowed through.
  try {
    const r = await fetch(`${api}/users/me?fields=courseRoleId&expand=user`, { credentials: 'same-origin' });
    if (r.ok) {
      const m = await r.json();
      if (['Student', 'Guest'].includes(m.courseRoleId) || /_previewuser$/i.test(m.user?.userName || '')) {
        alert('⚠ SCORM Package Locator is for administrators and instructors. It does not run for students or in Student Preview, because launching a package there records an attempt.');
        return;
      }
    }
  } catch (e) {
    console.error('SCORM Locator: course role check failed', e);
  }

  try {
    // ── Fetch Data ──────────────────────────────────────────────────────────
    const course = await getJson(`${api}?fields=id,courseId,name,ultraStatus`);
    const courseId = course.courseId;
    const contents = await getAllContents();

    const byId = new Map(contents.map(c => [c.id, c]));
    const pathOf = item => {
      const parts = [];
      let p = byId.get(item.parentId);
      const seen = new Set();
      while (p && !seen.has(p.id)) {
        seen.add(p.id);
        if (!/^ROOT$/i.test(p.title || '')) parts.unshift(p.title || p.id);
        p = byId.get(p.parentId);
      }
      return parts.join(' › ') || '(top level)';
    };

    const enc = encodeURIComponent(courseId);
    const parentFolderUrl = `${origin}/webapps/cmsmain/webui/internal/courses/${enc}/content`;
    const rows = contents.filter(isScorm).map(item => ({
      id: item.id,
      title: item.title || '(untitled)',
      path: pathOf(item),
      available: item.availability?.available || '',
      handler: item.contentHandler?.id || '',
      folderUrl: `${parentFolderUrl}/${item.id}`,
      manifestUrl: `${origin}/bbcswebdav/internal/courses/${enc}/content/${item.id}/imsmanifest.xml`,
      previewUrl: ''
    }));
    // Precheck: folder links and downloads only work with Content Collection access to the course's
    // internal area. That access is per course, so one probe of the first package folder answers it.
    const [hasAccess] = await Promise.all([
      rows.length ? canOpenFolder(rows[0].folderUrl) : false,
      ...rows.map(async r => { r.previewUrl = await getPreviewUrl(r.id); })
    ]);

    // ── Render Panel ────────────────────────────────────────────────────────
    const panel = ensurePanel(document, { id: 'bbScormLocator', title: '📦 SCORM Package Locator' });
    panel.querySelector('#pageContextTop').innerHTML =
      `<div><b>Course:</b> ${esc(course.name)}</div><div><b>Course ID:</b> ${esc(courseId)} (${esc(coursePk)})</div><div><b>Content items scanned:</b> ${contents.length}</div>` +
      (rows.length ? `<div><b>Package folder access:</b> ${hasAccess ? '✔ yes' : '✖ no (System Admin access to the Content Collection is required)'}</div>` : '');

    panel.querySelector('#bbScormLocatorList')?.remove();
    const list = document.createElement('div');
    list.id = 'bbScormLocatorList';
    panel.appendChild(list);

    if (!rows.length) {
      list.innerHTML = '<p style="margin:8px 0">No SCORM items found in this course.</p>';
    } else {
      const link = (href, label) => `<a class="cmp-link" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;
      list.innerHTML = rows.map(r => `<div class="cmp-card"><div style="font-weight:600">${esc(r.title)}</div><div class="cmp-muted" style="margin:2px 0 6px">${esc(r.path)} · ${esc(r.id)} · Available: ${esc(r.available)}</div><div style="display:flex;flex-wrap:wrap;align-items:center;row-gap:4px">${hasAccess ? link(r.folderUrl, '📂 Package folder') + link(r.manifestUrl, '📄 imsmanifest.xml') : ''}${r.previewUrl ? link(r.previewUrl, '▶ Preview') : ''}${hasAccess ? `<button class="cmp-btn cmp-btn-outline cmp-btn-sm" data-dl="${esc(r.id)}">⬇ Download zip</button><span class="cmp-muted" data-status="${esc(r.id)}" style="margin-left:8px"></span>` : ''}</div>${hasAccess ? `<div class="cmp-srcline cmp-mono cmp-muted" style="margin-top:4px">${esc(r.folderUrl)}</div>` : ''}</div>`).join('') +
        (hasAccess
          ? `<p class="cmp-muted" style="margin:8px 0 0"><b>Download zip</b> fetches the package straight from the Content Collection (same as selecting all files in the package folder and choosing <b>Download Package</b>). The zip has imsmanifest.xml at its root and can be re-uploaded as is. All SCORM folders for this course: <a class="cmp-link" href="${esc(parentFolderUrl)}" target="_blank" rel="noopener">${esc(parentFolderUrl)}</a></p>`
          : `<p class="cmp-muted" style="margin:8px 0 0">Package folders and downloads are hidden because your account can't open this course's internal Content Collection area. Ask a System Admin to run this bookmarklet to recover the packages.</p>`);
    }

    const btnRow = panel.querySelector('#buttonRowPrimary');
    btnRow.innerHTML = '';
    const setStatus = (row, text) => { const s = list.querySelector(`[data-status="${row.id}"]`); if (s) s.textContent = text; };
    const runDownload = async row => {
      setStatus(row, '⏳ Downloading…');
      try {
        const size = await downloadPackage(row, courseId);
        setStatus(row, `✔ Downloaded (${Math.round(size / 1024)} KB)`);
        return true;
      } catch (e) {
        console.error(`SCORM Locator: download failed for ${row.id}`, e);
        setStatus(row, `✖ ${e.message}`);
        return false;
      }
    };
    list.addEventListener('click', async ev => {
      const btn = ev.target.closest('button[data-dl]');
      const row = btn && rows.find(r => r.id === btn.dataset.dl);
      if (!row) return;
      btn.disabled = true;
      if (!(await runDownload(row))) alert(`⚠ Could not download "${row.title}". See the message in the panel; the console has details.`);
      btn.disabled = false;
    });
    if (rows.length && hasAccess) {
      addBtn(document, btnRow, '⬇ All packages', async ev => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        let failed = 0;
        for (const [i, row] of rows.entries()) {
          panel.querySelector('#summary').textContent = `Downloading ${i + 1} of ${rows.length}…`;
          if (!(await runDownload(row))) failed++;
        }
        panel.querySelector('#summary').textContent = `Downloaded ${rows.length - failed} of ${rows.length} package(s).`;
        btn.disabled = false;
        if (failed) alert(`⚠ ${failed} package(s) could not be downloaded. See the messages in the panel.`);
      });
      addBtn(document, btnRow, '📋 Copy folder links', async () => {
        const text = rows.map(r => `${r.title}\t${r.folderUrl}`).join('\n');
        try {
          await navigator.clipboard.writeText(text);
          panel.querySelector('#summary').textContent = `✔ Copied ${rows.length} link(s) to the clipboard.`;
        } catch (e) {
          console.error('SCORM Locator: clipboard write failed', e);
          alert('⚠ Could not copy to the clipboard. Use the CSV download instead.');
        }
      });
    }
    if (rows.length) {
      addBtn(document, btnRow, '⬇ CSV', () => {
        const header = ['Title', 'Content ID', 'Path', 'Available', 'Handler', 'Package Folder', 'Manifest', 'Preview'];
        const lines = [header, ...rows.map(r => [r.title, r.id, r.path, r.available, r.handler, r.folderUrl, r.manifestUrl, r.previewUrl])]
          .map(cols => cols.map(csvCell).join(','));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `scorm_packages_${courseId}.csv`;
        a.click();
      });
    }

    panel.querySelector('#summary').textContent = `${rows.length} SCORM item(s) found.`;
    if (course.ultraStatus && course.ultraStatus !== 'Ultra') {
      panel.querySelector('#summary').textContent += ' Note: this is not an Ultra course; package storage location is unverified for Original courses.';
    }
    // Re-center now that the list has given the panel its final width.
    panel.style.left = Math.max(0, (window.innerWidth - panel.offsetWidth) / 2) + 'px';
  } catch (e) {
    console.error('SCORM Locator failed', e);
    alert(`⚠ SCORM Package Locator could not read this course: ${e.message}`);
  }
})();
