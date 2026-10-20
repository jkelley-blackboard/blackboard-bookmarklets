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
    panel.style.cssText = 'position:fixed;top:20px;left:20px;z-index:2147483647;background:#fffbe6;border:3px solid #111;border-radius:8px;padding:12px;min-width:380px;max-width:min(960px,94vw);max-height:72vh;overflow:auto;box-shadow:0 6px 18px rgba(0,0,0,.25);font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111';
    const title = options.title || 'Bookmarklet Panel';
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-weight:600">${esc(title)}</span><button id="${panelId}-close" class="cmp-btn" style="background:#111;color:#fff;padding:2px 8px;border-radius:6px">✕</button></div><div id="pageContextTop" style="border:1px solid #e5e7eb;background:#fff;padding:6px;border-radius:6px;margin:6px 0;max-height:120px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.35"></div><div id="buttonRowPrimary" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div><div id="summary" style="margin-top:6px;font-weight:500"></div>`;
    const style = doc.createElement('style');
    style.textContent = `#${panelId} .cmp-srcline{white-space:pre-wrap;word-break:break-word} #${panelId} button.cmp-btn{margin:0;padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #5b21b6;background:#7c3aed;color:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06)} #${panelId} button.cmp-btn:hover{filter:brightness(1.05)}`;
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
      const link = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener" style="color:#5b21b6;font-weight:600;margin-right:12px">${label}</a>`;
      list.innerHTML = rows.map(r => `<div style="border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:8px;margin:8px 0"><div style="font-weight:600">${esc(r.title)}</div><div style="font-size:12px;color:#555;margin:2px 0 6px">${esc(r.path)} · ${esc(r.id)} · Available: ${esc(r.available)}</div><div>${hasAccess ? link(r.folderUrl, '📂 Package folder') + link(r.manifestUrl, '📄 imsmanifest.xml') : ''}${r.previewUrl ? link(r.previewUrl, '▶ Preview') : ''}${hasAccess ? `<button class="cmp-btn" data-dl="${esc(r.id)}" style="padding:2px 8px;font-size:12px">⬇ Download zip</button> <span data-status="${esc(r.id)}" style="font-size:12px;color:#555"></span>` : ''}</div>${hasAccess ? `<div class="cmp-srcline" style="font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#333;margin-top:4px">${esc(r.folderUrl)}</div>` : ''}</div>`).join('') +
        (hasAccess
          ? `<p style="font-size:12px;color:#555;margin:8px 0 0"><b>Download zip</b> fetches the package straight from the Content Collection (same as selecting all files in the package folder and choosing <b>Download Package</b>). The zip has imsmanifest.xml at its root and can be re-uploaded as is. All SCORM folders for this course: <a href="${esc(parentFolderUrl)}" target="_blank" rel="noopener" style="color:#5b21b6">${esc(parentFolderUrl)}</a></p>`
          : `<p style="font-size:12px;color:#555;margin:8px 0 0">Package folders and downloads are hidden because your account can't open this course's internal Content Collection area. Ask a System Admin to run this bookmarklet to recover the packages.</p>`);
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
