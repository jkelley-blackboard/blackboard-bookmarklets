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

        // Build table rows
        let rowsHtml = '';
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

            rowsHtml += `<tr>
                <td><img src="${u.avatar?.viewUrl || 'https://static.bbcdn.io/images/avatars/default.svg'}" alt=""></td>
                <td>${u.name?.given || ''} ${u.name?.family || ''}</td>
                <td>${u.userName || ''}</td>
                <td>${u.contact?.email || u.contact?.institutionEmail || ''}</td>
                <td>${u.studentId || ''}</td>
                <td>${otherName}</td>
                <td>${u.pronouns || ''}</td>
                <td>${pron}</td>
                <td>${roleMap[item.courseRoleId] || item.courseRoleId || ''}</td>
                <td>${item.availability?.available || ''}</td>
                <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : ''}</td>
                <td>${item.lastAccessed ? new Date(item.lastAccessed).toLocaleString() : ''}</td>
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
                #bbRosterClose, #bbRosterPrint {
                    float: right;
                    cursor: pointer;
                    background: #333;
                    color: #fff;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 5px;
                    margin-left: 4px;
                }
                #bbRosterOverlay img { width: 25px; height: 25px; border-radius: 50%; object-fit: cover; }
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    #bbRosterOverlay, #bbRosterOverlay * { visibility: visible; }
                    #bbRosterOverlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; box-shadow: none; }
                    #bbRosterClose, #bbRosterPrint { display: none; }
                    tr { page-break-inside: avoid; }
                    th, td { font-size: 9pt; padding: 2px 4px; }
                    img { width: 20px; height: 20px; }
                }
            </style>
            <div id="bbRosterOverlay">
                <button id="bbRosterClose">✖ Close</button>
                <button id="bbRosterPrint">🖨 Print</button>
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
                            <th>Last Access</th>
                        </tr>
                        ${rowsHtml}
                    </table>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close and print buttons
        document.getElementById('bbRosterClose').onclick = () => overlay.remove();
        document.getElementById('bbRosterPrint').onclick = () => {
            const w = window.open();
            w.document.write(overlay.innerHTML);
            w.document.close();
            w.print();
        };

    } catch (e) {
        alert('Error: ' + e.message);
        console.error(e);
    }
})();
