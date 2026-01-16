// Blackboard User Details Bookmarklet (Updated Version)
(() => {
    // Find the Blackboard admin iframe
    const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
    
    if (!iframe || !iframe.contentDocument) {
        return alert("⚠ Go to Admin > Users > Users to run this.");
    }
    
    const doc = iframe.contentDocument;
    const origin = doc.location.origin;
    
    if (!doc.location.pathname.includes("/webapps/blackboard/execute/userManager")) {
        return alert("⚠ Go to Admin > Users > Users to run this.");
    }
    
    // Cache for user data
    const userCache = {};
    const buttonId = "clearProfileInfoIcons";
    
    // Create "Clear Icons" button if it doesn't exist
    if (!doc.querySelector(`#${buttonId}`)) {
        const clearButton = doc.createElement("button");
        clearButton.id = buttonId;
        clearButton.textContent = "Clear Icons";
        Object.assign(clearButton.style, {
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: "9999",
            background: "purple",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "14px"
        });
        
        clearButton.onclick = () => {
            doc.querySelectorAll(".profile-info-icon").forEach(icon => icon.remove());
            clearButton.remove();
            Object.keys(userCache).forEach(key => delete userCache[key]);
        };
        
        doc.body.appendChild(clearButton);
    }
    
    // Add info icons to each user profile
    doc.querySelectorAll("span.profileCardAvatarThumb").forEach(avatar => {
        // Skip if icon already exists
        if (avatar.previousSibling?.classList?.contains("profile-info-icon")) {
            return;
        }
        
        const usernameFromPage = avatar.textContent.trim();
        if (!usernameFromPage) return;
        
        // Create info icon
        const infoIcon = doc.createElement("span");
        infoIcon.textContent = "🛈";
        infoIcon.title = "Hover to load user info";
        infoIcon.className = "profile-info-icon";
        Object.assign(infoIcon.style, {
            cursor: "pointer",
            marginRight: "6px"
        });
        
        // Load user data on hover
        infoIcon.onmouseenter = () => {
            if (userCache[usernameFromPage]) {
                infoIcon.title = userCache[usernameFromPage];
                return;
            }
            
            infoIcon.title = "Loading...";
            const apiUrl = `${origin}/learn/api/public/v1/users/userName:${encodeURIComponent(usernameFromPage)}?fields=id,userName,externalId,studentId,name,contact,institutionRoleIds,systemRoleIds,created,lastLogin,uuid`;
            
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    const userName = data.userName || "N/A";
                    const id = data.id || "N/A";
                    const uuid = data.uuid || "N/A";
                    const externalId = data.externalId || "N/A";
                    const studentId = data.studentId || "N/A";
                    const givenName = data.name?.given || "";
                    const familyName = data.name?.family || "";
                    const otherName = data.name?.other || "";
                    const fullName = (givenName + " " + familyName).trim() || "N/A";
                    const email = data.contact?.email || "N/A";
                    const institutionEmail = data.contact?.institutionEmail || "N/A";
                    const institutionRoles = data.institutionRoleIds?.join(", ") || "N/A";
                    const systemRoles = data.systemRoleIds?.join(", ") || "N/A";
                    const created = data.created ? new Date(data.created).toLocaleString() : "N/A";
                    const lastLogin = data.lastLogin ? new Date(data.lastLogin).toLocaleString() : "N/A";
                    
                    const infoText = 
                        "Username: " + userName + "\n" +
                        "External ID: " + externalId + "\n" +
                        "Primary Key: " + id + "\n" +
                        "Student ID: " + studentId + "\n" +
                        "Full Name: " + fullName + "\n" +
                        (otherName ? "Other Name: " + otherName + "\n" : "") +
                        "Email: " + email + "\n" +
                        "Institution Email: " + institutionEmail + "\n" +
                        "Institution Roles: " + institutionRoles + "\n" +
                        "System Roles: " + systemRoles + "\n" +
                        "Created: " + created + "\n" +
                        "Last Login: " + lastLogin + "\n" +
                        "UUID: " + uuid;
                    
                    infoIcon.title = infoText;
                    userCache[usernameFromPage] = infoText;
                })
                .catch(error => {
                    infoIcon.title = "Error fetching user info";
                    console.error("Fetch error:", error);
                });
        };
        
        // Copy to clipboard on click
        infoIcon.onclick = () => {
            if (infoIcon.title && 
                infoIcon.title !== "Hover to load user info" && 
                infoIcon.title !== "Loading...") {
                
                navigator.clipboard.writeText(infoIcon.title)
                    .then(() => {
                        infoIcon.textContent = "✅";
                        setTimeout(() => infoIcon.textContent = "🛈", 1000);
                    })
                    .catch(error => {
                        console.error("Clipboard error:", error);
                        alert("Failed to copy to clipboard.");
                    });
            }
        };
        
        avatar.parentElement.insertBefore(infoIcon, avatar);
    });
})();
