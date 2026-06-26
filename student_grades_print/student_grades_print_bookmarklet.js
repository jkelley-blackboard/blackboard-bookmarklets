/**
 * Student Grade Print
 *
 * Description: Opens a clean, print-ready view of the individual student grades
 * panel as seen by an instructor in the Blackboard Ultra gradebook. Extracts
 * the student's name, username, ID, last access, current grade, course name,
 * and all grade item rows (item name, due date, status, grade, and any late/
 * formative flags), then renders them in a formatted print window.
 * Automatically pages through all pages of grade items before printing.
 *
 * Usage: Open a course in Blackboard Ultra, navigate to Gradebook, click a
 * student row to open the individual student grades side panel (the panel
 * showing "Grades", "Progress", "Notes", etc. tabs), then click this
 * bookmarklet.
 *
 * DOM selectors target: .bb-offcanvas-panel[data-base-state-name="course.grades.peek"]
 *
 * Author: Jeff Kelley / Blackboard Solutions Engineering
 */

(function () {
  'use strict';

  // ── Page / panel guard ─────────────────────────────────────────────────────
  const panel = document.querySelector('.bb-offcanvas-panel[data-base-state-name="course.grades.peek"]');
  if (!panel || panel.getAttribute('aria-hidden') === 'true') {
    alert('⚠ Please open a student\'s grade panel in the Blackboard gradebook first, then run this bookmarklet.');
    return;
  }

  // ── Helper: escape HTML ────────────────────────────────────────────────────
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Extract student metadata ───────────────────────────────────────────────
  const studentName = (panel.querySelector('h1 bdi') || panel.querySelector('[class*="baseText"]'))?.innerText?.trim() || 'Unknown Student';
  const courseName  = panel.querySelector('[class*="subHeader"]')?.innerText?.trim() || '';

  const userFields = panel.querySelectorAll('[class*="userFieldContainer"]');
  let username = '', studentId = '', lastAccess = '';
  userFields.forEach(function (field) {
    const label = (field.querySelector('[class*="userLabel"]')?.innerText || '').replace(':', '').trim().toLowerCase();
    const value = (field.querySelector('[class*="userValues"]')?.innerText || '').trim();
    if (label === 'username') username = value;
    if (label === 'id') studentId = value;
    if (label === 'last access') lastAccess = value;
  });

  // Current grade — first big-pill in the panel header area (not the table)
  const currentGradePill = panel.querySelector('[class*="panelHeaderControls"] [class*="readonlyPill"]')
    || panel.querySelector('[class*="readonlyPill"][class*="big-pill"]');
  const currentGrade = currentGradePill?.innerText?.trim() || '--';

  // ── Helper: scrape all visible grade rows from the table ───────────────────
  function scrapeCurrentPage() {
    const rows = panel.querySelectorAll('tr[data-testid^="course-student-grades-table-row-"]');
    const items = [];
    rows.forEach(function (row) {
      const nameEl = row.querySelector('[id^="course-student-grades-item-name-"]');
      const itemName = nameEl?.innerText?.trim() || '';
      if (!itemName) return;

      const cells = row.querySelectorAll('td');
      const dueDate = cells[1]?.innerText?.trim() || '';
      const status  = cells[2]?.innerText?.trim() || '';

      const gradeCell = cells[3];
      const offscreenGrade = gradeCell?.querySelector('[class*="hideOffScreen"]')?.innerText?.trim() || '';
      const pillGrade      = gradeCell?.querySelector('[class*="readonlyPill"]')?.innerText?.replace(/\s+/g, ' ').trim() || '--';
      const grade = offscreenGrade || pillGrade;

      const pillEl = gradeCell?.querySelector('[class*="readonlyPill"]');
      let gradeColor = 'neutral';
      if (pillEl) {
        if (pillEl.className.includes('excellent')) gradeColor = 'excellent';
        else if (pillEl.className.includes('extremeFailing') || pillEl.className.includes('Failing')) gradeColor = 'failing';
        else if (pillEl.className.includes('grey')) gradeColor = 'neutral';
        else gradeColor = 'partial';
      }

      const subLabel = row.querySelector('[data-testid="item-description"]')?.innerText?.trim() || '';
      const isStruck = !!row.querySelector('[class*="strikeThroughIcon"]');

      items.push({ itemName, dueDate, status, grade, gradeColor, subLabel, isStruck });
    });
    return items;
  }

  // ── Helper: get the Next Page button if it is enabled ─────────────────────
  function getNextBtn() {
    const btn = panel.querySelector('.js-pagination-page-up-button');
    return (btn && !btn.disabled) ? btn : null;
  }

  // ── Helper: wait for the table to re-render after a page click ────────────
  // We detect re-render by watching for the first row's item-name text to change
  // from what it was before the click, with a timeout safety valve.
  function waitForPageChange(previousFirstName, callback) {
    const MAX_WAIT = 5000;   // ms
    const POLL    = 80;      // ms
    let elapsed   = 0;

    const timer = setInterval(function () {
      elapsed += POLL;
      const firstRow  = panel.querySelector('tr[data-testid^="course-student-grades-table-row-"]');
      const firstName = firstRow?.querySelector('[id^="course-student-grades-item-name-"]')?.innerText?.trim() || '';

      if (firstName && firstName !== previousFirstName) {
        clearInterval(timer);
        callback(null);
        return;
      }
      if (elapsed >= MAX_WAIT) {
        clearInterval(timer);
        callback(new Error('Timed out waiting for next page to load.'));
      }
    }, POLL);
  }

  // ── Collect all pages recursively, then build the print window ─────────────
  const allItems = [];

  function collectPage() {
    const pageItems = scrapeCurrentPage();
    allItems.push.apply(allItems, pageItems);

    const nextBtn = getNextBtn();
    if (!nextBtn) {
      // No more pages — render
      buildPrintWindow();
      return;
    }

    // Record the first item name on the current page so we can detect the DOM swap
    const firstNameNow = panel.querySelector('[id^="course-student-grades-item-name-"]')?.innerText?.trim() || '';

    nextBtn.click();

    waitForPageChange(firstNameNow, function (err) {
      if (err) {
        alert('⚠ Timed out waiting for the next page of grades to load. Partial results will be printed.');
      }
      collectPage();
    });
  }

  // ── Build and open the print window ───────────────────────────────────────
  function buildPrintWindow() {
    if (allItems.length === 0) {
      alert('⚠ No grade items found. Make sure the Grades tab is selected in the student panel.');
      return;
    }

    const printDate = new Date().toLocaleString();

    const rowsHtml = allItems.map(function (item) {
      const colorMap = { excellent: '#1a7f37', failing: '#b91c1c', neutral: '#555', partial: '#b45309' };
      const color  = colorMap[item.gradeColor] || '#555';
      const struck = item.isStruck ? ' style="opacity:0.55;"' : '';
      const subHtml = item.subLabel ? '<br><span class="sub-label">' + esc(item.subLabel) + '</span>' : '';
      return '<tr' + struck + '>' +
        '<td>' + esc(item.itemName) + subHtml + '</td>' +
        '<td>' + esc(item.dueDate)  + '</td>' +
        '<td>' + esc(item.status)   + '</td>' +
        '<td style="color:' + color + ';font-weight:600;">' + esc(item.grade) + '</td>' +
        '</tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + esc(studentName) + ' \u2014 Grades</title>' +
      '<style>' +
        'body{font-family:Arial,sans-serif;font-size:13px;margin:0;padding:0;color:#111;}' +
        '@media print{body{padding:0;}@page{margin:1.5cm;}}' +
        '.header{background:#1a1a2e;color:#fff;padding:18px 24px 14px;}' +
        '.header h1{margin:0 0 4px;font-size:20px;font-weight:700;}' +
        '.header .course{font-size:13px;opacity:0.8;margin:0;}' +
        '.meta{display:flex;flex-wrap:wrap;gap:8px 28px;padding:12px 24px;background:#f3f4f6;border-bottom:1px solid #ddd;font-size:12px;}' +
        '.meta span b{margin-right:4px;}' +
        '.grade-banner{padding:10px 24px;background:#fff;border-bottom:2px solid #e5e7eb;display:flex;align-items:center;gap:12px;}' +
        '.grade-banner .label{font-size:12px;color:#666;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}' +
        '.grade-banner .value{font-size:26px;font-weight:700;color:#1a1a2e;}' +
        'table{width:100%;border-collapse:collapse;margin:0;}' +
        'thead th{background:#f9fafb;border-bottom:2px solid #d1d5db;padding:8px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;}' +
        'tbody tr{border-bottom:1px solid #e5e7eb;}' +
        'tbody tr:hover{background:#f9fafb;}' +
        'td{padding:9px 16px;vertical-align:top;font-size:13px;}' +
        '.sub-label{font-size:11px;color:#b91c1c;font-style:italic;}' +
        '.footer{padding:10px 24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;margin-top:4px;}' +
        '.no-print{text-align:center;padding:14px;background:#f3f4f6;border-top:1px solid #ddd;}' +
        '.no-print button{padding:8px 20px;font-size:13px;cursor:pointer;background:#1a1a2e;color:#fff;border:none;border-radius:4px;margin:0 6px;}' +
        '@media print{.no-print{display:none;}}' +
      '</style>' +
      '</head><body>' +
      '<div class="header"><h1>' + esc(studentName) + '</h1><p class="course">' + esc(courseName) + '</p></div>' +
      '<div class="meta">' +
        '<span><b>Username:</b>' + esc(username)    + '</span>' +
        '<span><b>ID:</b>'       + esc(studentId)   + '</span>' +
        '<span><b>Last Access:</b>' + esc(lastAccess) + '</span>' +
      '</div>' +
      '<div class="grade-banner"><span class="label">Current Grade</span><span class="value">' + esc(currentGrade) + '</span></div>' +
      '<table>' +
        '<thead><tr><th>Item Name</th><th>Due Date</th><th>Status</th><th>Grade</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
      '<div class="footer">Printed ' + esc(printDate) + ' \u00b7 Blackboard LMS \u00b7 Experimental \u2014 for administrative use only (' + esc(String(allItems.length)) + ' items)</div>' +
      '<div class="no-print">' +
        '<button onclick="window.print()">\uD83D\uDDA8 Print</button>' +
        '<button onclick="window.close()">\u2715 Close</button>' +
      '</div>' +
      '</body></html>';

    const win = window.open('', '_blank', 'width=820,height=700');
    if (!win) {
      alert('⚠ Pop-up was blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // ── Kick off collection from page 1 ───────────────────────────────────────
  collectPage();

})();
