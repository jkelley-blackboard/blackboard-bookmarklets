(async function() {
    try {
        const courseMatch = location.pathname.match(/courses\/(_\d+_\d+)/);
        if (!courseMatch) return alert("Run on a course roster page only");
        const courseId = courseMatch[1];

        const courseResp = await fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}?fields=id,courseId,name`);
        const courseJson = await courseResp.json();
        const courseTitle = `${courseJson.courseId} - ${courseJson.name}`;

        const rolesResp = await fetch(`${location.origin}/learn/api/public/v1/courseRoles?fields=roleId,nameForCourses`);
        const rolesJson = await rolesResp.json();
        const roleMap = {};
        rolesJson.results.forEach(r => {
            roleMap[r.roleId] = r.nameForCourses || r.roleId;
        });

        const usersResp = await fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}/users?expand=user`);
        const usersJson = await usersResp.json();

        let rowsHtml = '';
        const csvRows = [['Name','Username','Email','Student ID','Other/Preferred Name','Pronouns','Pronunciation','Role','Availability','Last Login','Last Accessed']];

        usersJson.results.forEach(item => {
            const u = item.user || {};

            let otherName = u.name?.other || '';
            if (otherName) {
                if (u.name.preferredDisplayName === "OtherName") otherName += ' ✨';
                else if (u.name.preferredDisplayName === "Both") otherName += ' ➕';
            }

            let pron = u.pronunciation || '';
            if (u.pronunciationAudio?.viewUrl) pron += (pron ? ' ' : '') + '🔊';

            const fullName = `${u.name?.given || ''} ${u.name?.family || ''}`.trim();
            const email = u.contact?.email || u.contact?.institutionEmail || '';
            const role = roleMap[item.courseRoleId] || item.courseRoleId || '';
            const availability = item.availability?.available || '';
            const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '';
            const lastAccessed = item.lastAccessed ? new Date(item.lastAccessed).toLocaleString() : '';

            csvRows.push([fullName, u.userName || '', email, u.studentId || '', otherName, u.pronouns || '', pron, role, availability, lastLogin, lastAccessed]);

            rowsHtml += `
                <tr class="MuiTableRow-root">
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">
                        <div class="MuiAvatar-root MuiAvatar-circular" style="width:32px;height:32px">
                            <img class="MuiAvatar-img" src="${u.avatar?.viewUrl || 'https://static.bbcdn.io/images/avatars/default.svg'}" alt="${fullName}">
                        </div>
                    </td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${fullName}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${u.userName || ''}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${email}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${u.studentId || ''}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${otherName}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${u.pronouns || ''}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${pron}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${role}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${availability}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${lastLogin}</td>
                    <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${lastAccessed}</td>
                </tr>`;
        });

        const overlay = document.createElement('div');
        overlay.id = 'bbRosterRoot';
        overlay.innerHTML = `
            <style>
                #bbRosterRoot {
                    position: fixed;
                    inset: 12px;
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 8px 40px rgba(0,0,0,.32);
                    background: #fff;
                    font-family: inherit;
                }
                #bbRosterHeader {
                    background: var(--bb-theme-primary-color, #1d3557);
                    color: #fff;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    flex-shrink: 0;
                }
                #bbRosterHeaderTitle { flex: 1; min-width: 0; }
                #bbRosterHeaderTitle h2 {
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: #fff;
                }
                #bbRosterHeaderTitle p {
                    margin: 2px 0 0;
                    font-size: 0.78rem;
                    opacity: 0.8;
                    color: #fff;
                }
                #bbRosterHeaderBtns { display: flex; gap: 6px; flex-shrink: 0; }
                #bbRosterHeaderBtns button {
                    cursor: pointer;
                    background: rgba(255,255,255,0.15);
                    color: #fff;
                    border: 1px solid rgba(255,255,255,0.4);
                    padding: 5px 12px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-family: inherit;
                    white-space: nowrap;
                    text-transform: none;
                    box-shadow: none;
                    line-height: 1.5;
                }
                #bbRosterHeaderBtns button:hover { background: rgba(255,255,255,0.28); }
                #bbRosterContent { flex: 1; overflow: auto; }
                /* Sticky column headers */
                #bbRosterRoot thead th.MuiTableCell-head {
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    background: #f5f5f5;
                }
                /* Row hover */
                #bbRosterRoot .MuiTableRow-root:hover .MuiTableCell-body {
                    background-color: rgba(0,0,0,0.04);
                }
                @media (max-width: 768px) {
                    #bbRosterRoot { inset: 0; border-radius: 0; }
                }
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    #bbRosterRoot, #bbRosterRoot * { visibility: visible; }
                    #bbRosterRoot { position: absolute; inset: 0; box-shadow: none; border-radius: 0; }
                    #bbRosterHeader { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    #bbRosterHeaderBtns { display: none; }
                    #bbRosterRoot thead th { position: static; }
                    tr { page-break-inside: avoid; }
                }
            </style>
            <div id="bbRosterHeader">
                <div id="bbRosterHeaderTitle">
                    <h2>📋 ${courseTitle}</h2>
                    <p>${usersJson.results.length} enrolled users</p>
                </div>
                <div id="bbRosterHeaderBtns">
                    <button id="bbRosterCsv">⬇ CSV</button>
                    <button id="bbRosterPrint">🖨 Print</button>
                    <button id="bbRosterClose">✖ Close</button>
                </div>
            </div>
            <div id="bbRosterContent">
                <div class="MuiTableContainer-root">
                    <table class="MuiTable-root" role="grid">
                        <thead class="MuiTableHead-root">
                            <tr class="MuiTableRow-root MuiTableRow-head">
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium"></th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Name</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Username</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Email</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Student ID</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Other / Preferred Name</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Pronouns</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Pronunciation</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Role</th>
                                <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-sizeMedium">Availability</th>
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

        document.getElementById('bbRosterClose').onclick = () => overlay.remove();

        document.getElementById('bbRosterPrint').onclick = () => {
            const w = window.open();
            w.document.write(overlay.innerHTML);
            w.document.close();
            w.print();
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
