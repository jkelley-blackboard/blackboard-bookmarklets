(async function() {
    try {
        // Ensure we are on a course roster page
        const courseMatch = location.pathname.match(/courses\/(_\d+_\d+)/);
        if (!courseMatch) return alert("Run on a course roster page only");
        const courseId = courseMatch[1];

        // Fetch course details to display courseId + name
        const courseResp = await fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}?fields=id,courseId,name`);
        const courseJson = await courseResp.json();
        const courseTitle = `${courseJson.courseId} - ${courseJson.name}`;

        // Fetch course roles mapping
        const rolesResp = await fetch(`${location.origin}/learn/api/public/v1/courseRoles?fields=roleId,nameForCourses`);
        const rolesJson = await rolesResp.json();
        const roleMap = {};
        rolesJson.results.forEach(r => {
            roleMap[r.roleId] = r.nameForCourses || r.roleId;
        });

        // Fetch users
        const usersResp = await fetch(`${location.origin}/learn/api/public/v1/courses/${courseId}/users?expand=user`);
        const usersJson = await usersResp.json();

        // Build table rows and parallel CSV data
        let rowsHtml = '';
        const csvRows = [['Name','Username','Email','Student ID','Other/Preferred Name','Pronouns','Pronunciation','Role','Availability','Last Login','Last Accessed']];

        usersJson.results.forEach(item => {
            const u = item.user || {};

            // Other/Preferred name logic
            let otherName = u.name?.other || '';
            if (otherName) {
                if (u.name.preferredDisplayName === "OtherName") otherName += ' ✨';
                else if (u.name.preferredDisplayName === "Both") otherName += ' ➕';
            }

            // Pronunciation text and audio icon
            let pron = u.pronunciation || '';
            if (u.pronunciationAudio?.viewUrl) pron += (pron ? ' ' : '') + '🔊';

            const fullName = `${u.name?.given || ''} ${u.name?.family || ''}`.trim();
            const email = u.contact?.email || u.contact?.institutionEmail || '';
            const role = roleMap[item.courseRoleId] || item.courseRoleId || '';
            const availability = item.availability?.available || '';
            const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '';
            const lastAccessed = item.lastAccessed ? new Date(item.lastAccessed).toLocaleString() : '';

            csvRows.push([fullName, u.userName || '', email, u.studentId || '', otherName, u.pronouns || '', pron, role, availability, lastLogin, lastAccessed]);

            rowsHtml += `<tr>
                <td><img src="${u.avatar?.viewUrl || 'https://static.bbcdn.io/images/avatars/default.svg'}" alt=""></td>
                <td>${fullName}</td>
                <td>${u.userName || ''}</td>
                <td>${email}</td>
                <td>${u.studentId || ''}</td>
                <td>${otherName}</td>
                <td>${u.pronouns || ''}</td>
                <td>${pron}</td>
                <td>${role}</td>
                <td>${availability}</td>
                <td>${lastLogin}</td>
                <td>${lastAccessed}</td>
            </tr>`;
        });

        // Create overlay with responsive table
        const overlay = document.createElement('div');
        overlay.innerHTML = `
            <style>
                #bbRosterOverlay {
                    position: fixed;
                    top: 2%;
                    left: 2%;
                    width: 96%;
                    height: 96%;
                    background: #fff;
                    overflow: auto;
                    z-index: 999999;
                    font-family: sans-serif;
                    font-size: 10pt;
                }
                #bbRosterOverlay .table-container { overflow-x: auto; }
                #bbRosterOverlay table {
                    border-collapse: collapse;
                    width: 100%;
                    min-width: 1000px;
                    table-layout: auto;
                }
                #bbRosterOverlay th, #bbRosterOverlay td {
                    border: 1px solid #ccc;
                    padding: 3px 6px;
                    text-align: left;
                    vertical-align: middle;
                    word-break: break-word;
                }
                #bbRosterOverlay th { background: #f0f0f0; }
                #bbRosterClose, #bbRosterPrint, #bbRosterCsv {
                    float: right;
                    cursor: pointer;
                    background: #333;
                    color: #fff;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 5px;
                    margin-left: 4px;
                }
                #bbRosterCsv { background: #1a6b35; }
                #bbRosterOverlay img { width: 25px; height: 25px; border-radius: 50%; object-fit: cover; }
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    #bbRosterOverlay, #bbRosterOverlay * { visibility: visible; }
                    #bbRosterOverlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; box-shadow: none; }
                    #bbRosterClose, #bbRosterPrint, #bbRosterCsv { display: none; }
                    tr { page-break-inside: avoid; }
                    th, td { font-size: 9pt; padding: 2px 4px; }
                    img { width: 20px; height: 20px; }
                }
            </style>
            <div id="bbRosterOverlay">
                <button id="bbRosterClose">✖ Close</button>
                <button id="bbRosterPrint">🖨 Print</button>
                <button id="bbRosterCsv">⬇ Download CSV</button>
                <h2>📋 Course Roster for ${courseTitle}</h2>
                <p>${usersJson.results.length} enrolled users</p>
                <div class="table-container">
                    <table>
                        <tr>
                            <th>Avatar</th>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Student ID</th>
                            <th>Other/Preferred Name</th>
                            <th>Pronouns</th>
                            <th>Pronunciation</th>
                            <th>Role</th>
                            <th>Availability</th>
                            <th>Last Login</th>
                            <th>Last Accessed</th>
                        </tr>
                        ${rowsHtml}
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
