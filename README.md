# Blackboard Role Privileges Bookmarklets

These bookmarklets help **download** and **compare** Blackboard role privilege configurations for **System Roles** and **Course Roles**.

## Minimized versions may have slightly different details
The nature of minimizing...

---

## Features

### 1. **Download Privileges**
- Exports all role privileges for a selected **System Role** or **Course Role** into a JSON file.
- Includes:
  - Role type (`System` or `Course`)
  - Blackboard server hostname
  - Role name
  - Timestamp
  - Complete privilege list with current status and entitlement keys.
- Ensures **all pages are visible** by detecting pagination before allowing download.
- JSON file name indicates role type and name.

---

### 2. **Compare Privileges**
- Upload a previously downloaded JSON file to compare privileges.
- Highlights **mismatches** between the current Blackboard role and the uploaded file:
  - Adds a yellow ⚠️ icon in the privileges table with tooltip describing the mismatch.
- Provides filtering buttons:
  - **Show Permitted Mismatches**
  - **Show Restricted Mismatches**
  - **Show All Mismatches**
  - **Show All**
  - **Refresh Page** (reset view)
- Ensures you are on the **correct role type** (System or Course) before running.

---

## Installation

1. Copy the **minimized bookmarklet code** for either tool.
2. Create a new bookmark in your browser:
   - **Name:** e.g., `BB Download Privileges`
   - **URL:** Paste the code directly into the bookmark URL field.
3. Repeat for the **Compare Privileges** bookmarklet.

---

## Usage

### **1. Download JSON**
1. Navigate to the correct **Manage Privileges** page:
   - **System Role:**  
     ```
     /webapps/blackboard/execute/managePrivileges?type=System
     ```
   - **Course Role:**  
     ```
     /webapps/blackboard/execute/managePrivileges?type=Course
     ```
2. Select the role you want to export.
3. Ensure **all privileges are displayed on one page**:
   - If pagination is detected, a **warning appears** in the panel.
   - Use the **"Show All"** link in Blackboard before continuing.
4. Click **Download JSON** to save the privileges to a file.

Example file name:
bb_system_priv_Instructor.json
bb_course_priv_Teaching_Assistant.json



---

### **2. Compare JSON**
1. Navigate to the correct **Manage Privileges** page (System or Course).
2. Select the role you want to compare.
3. Ensure **all privileges are visible** (no pagination warning).
4. Click **Upload JSON**, and select a previously downloaded JSON file.
5. The table updates automatically:
   - Yellow ⚠️ icons appear where mismatches are found.
   - Hover over the icon to see the expected vs. actual status.
6. Use the filter buttons to view specific mismatches or reset the table.

---

## JSON Format

Sample JSON output:
```json
{
  "roleType": "Course",
  "system": "university.blackboard.com",
  "role": "Instructor",
  "timestamp": "2025-09-21T17:48:20.512Z",
  "privileges": {
    "Create Course": {
      "status": "permitted",
      "entitlement": "course.create"
    },
    "Delete Course": {
      "status": "restricted",
      "entitlement": "course.delete"
    }
  }
}
