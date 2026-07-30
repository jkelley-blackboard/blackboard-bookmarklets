/**
 * Ultra Course Roster
 *
 * Description: Generates a full course roster overlay for any Blackboard LMS Ultra course,
 *   pulling all enrolled users via the REST API and enriching with friendly course role names.
 * Usage: Navigate to a Blackboard LMS Ultra course page (URL contains /ultra/courses/),
 *   then activate the bookmarklet. Works from any tab within the course.
 * APIs/Pages: GET /learn/api/public/v1/courses/{id}
 *             GET /learn/api/public/v1/courseRoles
 *             GET /learn/api/public/v1/courses/{id}/users?expand=user
 * Author: Jeff Kelley / Blackboard Solutions Engineering
 */
(async function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // ── Page Guard ────────────────────────────────────────────────────────────
  const courseMatch = location.pathname.match(/courses\/(_\d+_\d+)/);
  if (!courseMatch) {
    alert('⚠ Please navigate to a Blackboard LMS Ultra course page first.');
    return;
  }
  const courseId = courseMatch[1];

  try {

    // ── Fetch Data ────────────────────────────────────────────────────────
    const [courseResp, rolesResp, usersResp] = await Promise.all([
      fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}?fields=id,courseId,name`),
      fetch(`${location.origin}/learn/api/public/v1/courseRoles?fields=roleId,nameForCourses`),
      fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}/users?expand=user`),
    ]);

    const courseJson = await courseResp.json();
    const rolesJson  = await rolesResp.json();
    const usersJson  = await usersResp.json();

    const courseTitle = `${courseJson.courseId} - ${courseJson.name}`;

    const roleMap = {};
    rolesJson.results.forEach(r => { roleMap[r.roleId] = r.nameForCourses || r.roleId; });

    // ── Build Table Rows ──────────────────────────────────────────────────
    const rosterRows = [];
    const csvRows = [['Name', 'Username', 'Email', 'Student ID', 'Other Name', 'Pronouns', 'Pronunciation', 'Role', 'Availability', 'Enrollment Date', 'Last Login', 'Last Accessed']];

    usersJson.results.forEach(item => {
      const u = item.user || {};

      let otherName = u.name?.other || '';
      if (otherName) {
        if (u.name.preferredDisplayName === 'OtherName') otherName += ' ✨';
        else if (u.name.preferredDisplayName === 'Both') otherName += ' ➕';
      }

      let pron = u.pronunciation || '';
      if (u.pronunciationAudio?.viewUrl) pron += (pron ? ' ' : '') + '🔊';

      const fullName = `${u.name?.given || ''} ${u.name?.family || ''}`.trim();
      const email = u.contact?.email || u.contact?.institutionEmail || '';
      const role = roleMap[item.courseRoleId] || item.courseRoleId || '';
      const availability = item.availability?.available || '';
      const enrollmentDate = fmtDate(item.created);
      const lastLogin = fmtDate(u.lastLogin);
      const lastAccessed = fmtDate(item.lastAccessed);
      const avatarSrc = u.avatar?.viewUrl || 'https://static.bbcdn.io/images/avatars/default.svg';

      rosterRows.push({ fullName, username: u.userName || '', email, studentId: u.studentId || '', otherName, pronouns: u.pronouns || '', pronunciation: pron, role, availability, enrollmentDate, lastLogin, lastAccessed, avatarSrc });
      csvRows.push([fullName, u.userName || '', email, u.studentId || '', otherName, u.pronouns || '', pron, role, availability, enrollmentDate, lastLogin, lastAccessed]);
    });

    function buildOverlayRowsHtml(rows) {
      return rows.map(row => `
        <tr class="MuiTableRow-root">
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-s0" style="padding:6px 10px">
            <div class="MuiAvatar-root MuiAvatar-circular" style="width:32px;height:32px">
              <img class="MuiAvatar-img" src="${esc(row.avatarSrc)}" alt="${esc(row.fullName)}">
            </div>
          </td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-s1 bb-trunc" title="${esc(row.fullName)}">${esc(row.fullName)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-trunc" title="${esc(row.username)}">${esc(row.username)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-trunc" title="${esc(row.email)}">${esc(row.email)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.studentId)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.otherName)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.pronouns)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.pronunciation)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.role)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.availability)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.enrollmentDate)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.lastLogin)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(row.lastAccessed)}</td>
        </tr>`).join('');
    }

    function buildPrintRowsHtml(rows) {
      return rows.map(row => `
        <tr>
          <td><img class="bb-print-avatar" src="${esc(row.avatarSrc)}" alt="${esc(row.fullName)}"></td>
          <td>${esc(row.fullName)}</td>
          <td>${esc(row.username)}</td>
          <td>${esc(row.email)}</td>
          <td>${esc(row.studentId)}</td>
          <td>${esc(row.otherName)}</td>
          <td>${esc(row.pronouns)}</td>
          <td>${esc(row.pronunciation)}</td>
          <td>${esc(row.role)}</td>
          <td>${esc(row.availability)}</td>
          <td>${esc(row.enrollmentDate)}</td>
          <td>${esc(row.lastLogin)}</td>
          <td>${esc(row.lastAccessed)}</td>
        </tr>`).join('');
    }

    function buildPrintWindowHtml() {
      const printRowsHtml = buildPrintRowsHtml(rosterRows);
      const printDate = new Date().toLocaleString();
      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(courseTitle)} — Roster Print</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#111}h1{margin:0 0 8px;font-size:20px}p{margin:0 0 16px;color:#666;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f5f5f5;font-weight:700}tr:nth-child(even){background:#fafafa}.bb-print-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;display:block}.toolbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px}.toolbar button{padding:8px 14px;border:none;border-radius:4px;background:#1d3557;color:#fff;cursor:pointer}@media print{body{padding:0} .toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">✖ Close</button></div><h1>${esc(courseTitle)}</h1><p>${rosterRows.length} enrolled users • Printed ${esc(printDate)}</p><table><thead><tr><th>Avatar</th><th>Name</th><th>Username</th><th>Email</th><th>Student ID</th><th>Other Name</th><th>Pronouns</th><th>Pronunciation</th><th>Role</th><th>Availability</th><th>Enrollment Date</th><th>Last Login</th><th>Last Accessed</th></tr></thead><tbody>${printRowsHtml}</tbody></table></body></html>`;
    }

    const rowsHtml = buildOverlayRowsHtml(rosterRows);

    // ── Render Overlay ────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'bbRosterRoot';

    // CSS uses single-line rules; <style> block kept readable in source, collapsed in minified.
    overlay.innerHTML = `
      <style>
        #bbRosterRoot {position:fixed;inset:12px;z-index:999999;display:flex;flex-direction:column;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.32);background:#fff;font-family:inherit}
        #bbRosterHeader {background:var(--bb-theme-primary-color,#1d3557);color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0}
        #bbRosterHeaderTitle {flex:1;min-width:0}
        #bbRosterHeaderTitle h2 {margin:0;font-size:1.05rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
        #bbRosterHeaderTitle p {margin:2px 0 0;font-size:0.78rem;opacity:0.8;color:#fff}
        #bbRosterHeaderBtns {display:flex;gap:6px;flex-shrink:0}
        #bbRosterHeaderBtns button {cursor:pointer;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);padding:5px 12px;border-radius:4px;font-size:0.8rem;font-family:inherit;white-space:nowrap;text-transform:none;box-shadow:none;line-height:1.5}
        #bbRosterHeaderBtns button:hover {background:rgba(255,255,255,0.28)}
        #bbRosterContent {flex:1;overflow:auto}
        #bbRosterRoot thead th.MuiTableCell-head {position:sticky;top:0;z-index:1;background:#f5f5f5}
        #bbRosterRoot .MuiTableRow-root:hover .MuiTableCell-body {background-color:rgba(0,0,0,0.04)}
        #bbRosterRoot .MuiTable-root {font-size:0.8rem}
        #bbRosterRoot td.MuiTableCell-body,#bbRosterRoot th.MuiTableCell-head {padding:10px 16px}
        #bbRosterRoot .bb-trunc {white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
        #bbRosterRoot td.bb-s0,#bbRosterRoot th.bb-s0 {position:sticky;left:0;z-index:1;background:#fff}
        #bbRosterRoot td.bb-s1,#bbRosterRoot th.bb-s1 {position:sticky;left:52px;z-index:1;background:#fff;box-shadow:2px 0 5px -2px rgba(0,0,0,.15)}
        #bbRosterRoot thead th.bb-s0,#bbRosterRoot thead th.bb-s1 {background:#f5f5f5;z-index:3}
        #bbRosterRoot .MuiTableRow-root:hover td.bb-s0.MuiTableCell-body,#bbRosterRoot .MuiTableRow-root:hover td.bb-s1.MuiTableCell-body {background:#f6f6f6}
        @media (max-width:768px) {#bbRosterRoot {inset:0;border-radius:0}}
      </style>
      <div id="bbRosterHeader">
        <div id="bbRosterHeaderTitle">
          <h2>📋 ${esc(courseTitle)}</h2>
          <p>${usersJson.results.length} enrolled users</p>
        </div>
        <div id="bbRosterHeaderBtns">
          <button id="bbRosterPrint">🖨 Print</button>
          <button id="bbRosterCsv">⬇ CSV</button>
          <button id="bbRosterClose">✖ Close</button>
        </div>
      </div>
      <div id="bbRosterContent">
        <div class="MuiTableContainer-root">
          <table class="MuiTable-root" role="grid">
            <thead class="MuiTableHead-root">
              <tr class="MuiTableRow-root MuiTableRow-head">
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium bb-s0"></th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium bb-s1">Name</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Username</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Email</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Student ID</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Other Name</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Pronouns</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Pronunciation</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Role</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Availability</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Enrollment Date</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Last Login</th>
                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Last Accessed</th>
              </tr>
            </thead>
            <tbody class="MuiTableBody-root">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // ── Event Handlers ────────────────────────────────────────────────────
    document.getElementById('bbRosterClose').onclick = () => overlay.remove();

    document.getElementById('bbRosterPrint').onclick = () => {
      const html = buildPrintWindowHtml();
      const win = window.open('', '_blank', 'width=1200,height=900');
      if (!win) {
        alert('⚠ Pop-up was blocked. Please allow pop-ups for this site and try again.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    };

    document.getElementById('bbRosterCsv').onclick = () => {
      const csv = csvRows
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseJson.courseId}_roster.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

  } catch (e) {
    alert('Error: ' + e.message);
    console.error(e);
  }

})();
