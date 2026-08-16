/**
 * CSS Selector Auditor
 *
 * Description: Scans the current page's live stylesheets for CSS rules
 *   driven by custom-property toggles (e.g. `display: var(--hide-show)`),
 *   the pattern used by test-mode hide/highlight CSS. For every selector
 *   found, runs it against the live DOM and reports match count, computed
 *   outline, computed display, and bounding-box size — so a custom CSS
 *   file's TEST-mode rules can be verified (matched? outlined? collapsed?)
 *   without manually inspecting each element in DevTools.
 * Usage: Navigate to any Blackboard LMS page where a custom CSS file using
 *   CSS-variable-driven toggle rules is loaded (e.g. a corrections-style
 *   deployment CSS). Run the bookmarklet — a panel appears with results.
 *   Open a specific menu/dialog/panel FIRST if you want to audit selectors
 *   that only render while it's open (e.g. a dropdown's menu items), then
 *   click "Re-scan" — a 0-match row does not necessarily mean a selector is
 *   broken, it may mean the target UI simply isn't in the DOM right now.
 * APIs/Pages: none (pure DOM/CSSOM inspection, no network calls)
 * Author: Jeff Kelley / Blackboard Solutions Engineering
 */
(function () {
  'use strict';

  // ── Page guard ─────────────────────────────────────────────────────────
  if (!document.styleSheets || document.styleSheets.length === 0) {
    alert('⚠ No stylesheets found on this page — nothing to audit.');
    return;
  }

  // ── Shared helpers ─────────────────────────────────────────────────────
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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

  // ── Selector splitting (respects parens/brackets — :has(a, b) stays one piece) ──
  function splitTopLevelSelectors(sel) {
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of sel) {
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  // ── Collect toggle-driven CSSStyleRules from every accessible stylesheet ──
  // "Toggle-driven" = declares display/outline (or any property) via var(--...).
  // This is the signature of test-mode hide/highlight CSS and keeps the scan
  // fast/targeted instead of walking Blackboard's entire internal stylesheet.
  function collectRules(includeAll) {
    const out = [];

    function walk(ruleList, layerName) {
      for (const rule of ruleList) {
        if (rule.selectorText) {
          const usesVar = /var\(--/.test(rule.style.cssText);
          if (includeAll || usesVar) {
            for (const piece of splitTopLevelSelectors(rule.selectorText)) {
              out.push({ selector: piece, layer: layerName, ruleText: rule.selectorText });
            }
          }
        }
        if (rule.cssRules) {
          const nextLayer = (rule.constructor && rule.constructor.name === 'CSSLayerBlockRule' && rule.name)
            ? rule.name
            : layerName;
          walk(rule.cssRules, nextLayer);
        }
      }
    }

    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules, null);
      } catch (e) {
        // Cross-origin stylesheet — cssRules access throws. Skip silently.
      }
    }
    return out;
  }

  // ── Evaluate each selector against the live DOM ───────────────────────
  function evaluateEntries(entries) {
    return entries.map(entry => {
      let elements;
      try {
        elements = document.querySelectorAll(entry.selector);
      } catch (e) {
        return { ...entry, error: e.message, matchCount: 0, matches: [] };
      }
      const matches = [...elements].slice(0, 8).map(el => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const hasOutline = cs.outlineStyle && cs.outlineStyle !== 'none';
        const collapsed = cs.display !== 'none' && cs.display !== 'contents' && rect.width === 0 && rect.height === 0;
        return {
          outline: hasOutline ? `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}` : 'none',
          display: cs.display,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          collapsed,
        };
      });
      return { ...entry, error: null, matchCount: elements.length, matches };
    });
  }

  function statusIcon(result) {
    if (result.error) return '❌';
    if (result.matchCount === 0) return '➖';
    const anyCollapsed = result.matches.some(m => m.collapsed);
    if (anyCollapsed) return '⚠️';
    const anyOutlined = result.matches.some(m => m.outline !== 'none');
    if (anyOutlined) return '🟡';
    const allHidden = result.matches.every(m => m.display === 'none');
    if (allHidden) return '🚫';
    return '⚪';
  }

  function getHideShowVars() {
    const cs = getComputedStyle(document.documentElement);
    const vars = {};
    ['--hide-show', '--hide-show-li', '--hide-show-flex'].forEach(v => {
      const val = cs.getPropertyValue(v).trim();
      if (val) vars[v] = val;
    });
    return vars;
  }

  // ── Run + render ────────────────────────────────────────────────────────
  const panel = ensurePanel(document, { title: 'Bb CSS Selector Auditor', id: 'cssAuditPanel' });
  panel.style.minWidth = '640px';
  panel.style.maxWidth = '90vw';

  const topBox = panel.querySelector('#pageContextTop');
  const btnRow = panel.querySelector('#buttonRowPrimary');
  const summary = panel.querySelector('#summary');

  let resultsBox = panel.querySelector('#cssAuditResults');
  if (!resultsBox) {
    resultsBox = document.createElement('div');
    resultsBox.id = 'cssAuditResults';
    resultsBox.style.cssText = 'margin-top:8px;max-height:44vh;overflow:auto;border:1px solid #e5e7eb;background:#fff;border-radius:6px;';
    panel.appendChild(resultsBox);
  }

  let controlsBox = panel.querySelector('#cssAuditControls');
  if (!controlsBox) {
    controlsBox = document.createElement('div');
    controlsBox.id = 'cssAuditControls';
    controlsBox.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center;';
    panel.insertBefore(controlsBox, resultsBox);
  }
  controlsBox.innerHTML = `
    <input id="cssAuditSelectorFilter" type="text" placeholder="Filter by selector text…" style="flex:1;min-width:160px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px">
    <label style="font-size:12px;display:flex;align-items:center;gap:4px;white-space:nowrap">
      <input id="cssAuditIncludeAll" type="checkbox"> include all CSS (slow)
    </label>
  `;

  let lastResults = [];

  function scan() {
    const includeAll = panel.querySelector('#cssAuditIncludeAll').checked;
    const entries = collectRules(includeAll);
    lastResults = evaluateEntries(entries);
    render();
  }

  function render() {
    const filterText = (panel.querySelector('#cssAuditSelectorFilter').value || '').toLowerCase();
    const filtered = filterText
      ? lastResults.filter(r => r.selector.toLowerCase().includes(filterText))
      : lastResults;

    const hideShowVars = getHideShowVars();
    const modeLine = Object.keys(hideShowVars).length
      ? Object.entries(hideShowVars).map(([k, v]) => `${k}: <b>${esc(v)}</b>`).join(' &nbsp;·&nbsp; ')
      : '(no --hide-show* variables found on :root)';
    topBox.innerHTML = `
      <div><b>Host:</b> ${esc(location.host)}</div>
      <div><b>Captured:</b> ${esc(new Date().toLocaleString())}</div>
      <div style="margin-top:4px">${modeLine}</div>
    `;

    const rows = filtered.map(r => {
      const icon = statusIcon(r);
      const detail = r.error
        ? `<span style="color:#b91c1c">${esc(r.error)}</span>`
        : `${r.matchCount} match${r.matchCount === 1 ? '' : 'es'}` +
          (r.matches.length ? ' — ' + r.matches.map(m =>
            `${m.outline !== 'none' ? 'outlined' : m.display === 'none' ? 'hidden' : 'visible'}${m.collapsed ? ' ⚠COLLAPSED' : ''} (${m.width}×${m.height})`
          ).join(', ') : '');
      return `
        <div style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">
          <div><span style="margin-right:6px">${icon}</span><code style="word-break:break-all">${esc(r.selector)}</code>${r.layer ? ` <span style="color:#7c3aed">[@layer ${esc(r.layer)}]</span>` : ''}</div>
          <div style="margin-left:22px;color:#555">${detail}</div>
        </div>
      `;
    }).join('');

    resultsBox.innerHTML = rows || '<div style="padding:10px;color:#888">No matching selectors found. Try "include all CSS" or check the page has a custom stylesheet loaded.</div>';

    const counts = filtered.reduce((acc, r) => {
      const k = statusIcon(r);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    summary.innerHTML = `${filtered.length} selector${filtered.length === 1 ? '' : 's'} — ` +
      Object.entries(counts).map(([icon, n]) => `${icon} ${n}`).join('  ');
  }

  btnRow.innerHTML = '';
  addBtn(document, btnRow, 'Re-scan', scan, 'cssAuditRescan');
  addBtn(document, btnRow, 'Export JSON', () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJSON({
      source: { host: location.host, url: location.href, timestamp: new Date().toISOString(), hideShowVars: getHideShowVars() },
      selectors: lastResults,
    }, `css-selector-audit_${location.host}_${stamp}.json`);
  }, 'cssAuditExport');

  panel.querySelector('#cssAuditSelectorFilter').addEventListener('input', render);
  panel.querySelector('#cssAuditIncludeAll').addEventListener('change', scan);

  scan();
})();
