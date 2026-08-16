/**
 * DOM Snapshot Downloader
 *
 * Description: Captures the current page's live, post-render DOM — not the
 *   original server response — and downloads it as a standalone .html file.
 *   Useful for filing detailed bug reports or archiving exact page state,
 *   since "View Page Source" only shows pre-JavaScript markup and DevTools'
 *   "Copy outerHTML" is a manual multi-step process.
 * Usage: Works on any page, not just Blackboard LMS. Run the bookmarklet,
 *   review the snapshot summary in the panel, then click Download Snapshot.
 *   Click Re-capture first if you changed the page state (opened a menu,
 *   expanded a panel) since running the bookmarklet.
 * APIs/Pages: none (pure DOM read, no network calls)
 * Author: Jeff Kelley / Blackboard Solutions Engineering
 */
(function () {
  'use strict';

  // ── Shared helpers ─────────────────────────────────────────────────────
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function downloadHTML(html, filename) {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

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
    panel.style.cssText = `
      position:fixed;
      top:20px;
      left:20px;
      z-index:2147483647;
      background:#fffbe6;
      border:3px solid #111;
      border-radius:8px;
      padding:12px;
      min-width:380px;
      max-height:72vh;
      overflow:auto;
      box-shadow:0 6px 18px rgba(0,0,0,.25);
      font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    `;

    const title = options.title || 'Bookmarklet Panel';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-weight:600">${title}</span>
        <button id="${panelId}-close" class="cmp-btn" style="background:#111;color:#fff;padding:2px 8px;border-radius:6px">✕</button>
      </div>
      <div id="pageContextTop" style="border:1px solid #e5e7eb;background:#fff;padding:6px;border-radius:6px;margin:6px 0;max-height:120px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;line-height:1.35"></div>
      <div id="buttonRowPrimary" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>
      <div id="summary" style="margin-top:6px;font-weight:500"></div>
    `;

    const style = doc.createElement('style');
    style.textContent = `
      #${panelId} .cmp-srcline {
        white-space:pre-wrap;
        word-break:break-word;
      }
      #${panelId} button.cmp-btn {
        margin:0;
        padding:6px 10px;
        font-size:13px;
        border-radius:6px;
        border:1px solid #5b21b6;
        background:#7c3aed;
        color:#fff;
        cursor:pointer;
        box-shadow:0 1px 2px rgba(0,0,0,.06);
      }
      #${panelId} button.cmp-btn:hover {
        filter:brightness(1.05);
      }
    `;
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

  // ── Build the snapshot, excluding this tool's own injected panel ───────
  const PANEL_ID = 'domSnapshotPanel';

  function buildSnapshot() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelector('#' + PANEL_ID)?.remove();
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  // ── Run + render ────────────────────────────────────────────────────────
  const panel = ensurePanel(document, { title: 'Bb DOM Snapshot Downloader', id: PANEL_ID });

  const topBox = panel.querySelector('#pageContextTop');
  const btnRow = panel.querySelector('#buttonRowPrimary');
  const summary = panel.querySelector('#summary');

  let lastHtml = '';

  function capture() {
    lastHtml = buildSnapshot();
    const kb = (new Blob([lastHtml]).size / 1024).toFixed(1);
    const elementCount = document.documentElement.querySelectorAll('*').length;

    topBox.innerHTML = `
      <div><b>Host:</b> ${esc(location.host)}</div>
      <div><b>URL:</b> ${esc(location.href)}</div>
      <div><b>Captured:</b> ${esc(new Date().toLocaleString())}</div>
    `;
    summary.textContent = `~${kb} KB — ${elementCount} elements`;
  }

  btnRow.innerHTML = '';
  addBtn(document, btnRow, 'Re-capture', capture, 'domSnapshotRecapture');
  addBtn(document, btnRow, 'Download Snapshot', () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadHTML(lastHtml, `dom-snapshot_${location.host}_${stamp}.html`);
  }, 'domSnapshotDownload');

  capture();
})();
