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
    let rowsHtml = '';
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

      const fullName    = `${u.name?.given || ''} ${u.name?.family || ''}`.trim();
      const email       = u.contact?.email || u.contact?.institutionEmail || '';
      const role           = roleMap[item.courseRoleId] || item.courseRoleId || '';
      const availability   = item.availability?.available || '';
      const enrollmentDate = fmtDate(item.created);
      const lastLogin      = fmtDate(u.lastLogin);
      const lastAccessed   = fmtDate(item.lastAccessed);
      const avatarSrc   = u.avatar?.viewUrl || 'https://static.bbcdn.io/images/avatars/default.svg';

      csvRows.push([fullName, u.userName || '', email, u.studentId || '', otherName, u.pronouns || '', pron, role, availability, enrollmentDate, lastLogin, lastAccessed]);

      rowsHtml += `
        <tr class="MuiTableRow-root">
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-s0" style="padding:6px 10px">
            <div class="MuiAvatar-root MuiAvatar-circular" style="width:32px;height:32px">
              <img class="MuiAvatar-img" src="${esc(avatarSrc)}" alt="${esc(fullName)}">
            </div>
          </td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-s1 bb-trunc" title="${esc(fullName)}">${esc(fullName)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-trunc" title="${esc(u.userName || '')}">${esc(u.userName || '')}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium bb-trunc" title="${esc(email)}">${esc(email)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(u.studentId || '')}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(otherName)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(u.pronouns || '')}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(pron)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(role)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(availability)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(enrollmentDate)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(lastLogin)}</td>
          <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${esc(lastAccessed)}</td>
        </tr>`;
    });

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
