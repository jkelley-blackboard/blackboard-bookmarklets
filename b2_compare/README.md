# B2 Export Utility Bookmarklet

This bookmarklet provides a lightweight interface for extracting installed Building Block (B2) tool data from the Blackboard **Admin > Tools > Installed Tools** page. It displays system context, allows JSON export of tool metadata, and includes a REST API version check.

## Features

- Extracts tool metadata from the Installed Tools page
- Displays system context including hostname, base version, and timestamp
- Fetches system version via REST API (`/learn/api/public/v1/system/version`)
- Exports data as a downloadable JSON file
- UI panel with styled buttons and context display

## Requirements

- Must be run from the **Admin > Tools > Installed Tools** page in Blackboard
- The "Show All" option must be enabled on the page
- REST API version check requires a valid session and same-origin access

## Usage

1. Navigate to **Admin > Tools > Installed Tools** in Blackboard.
2. Click **Show All** to ensure all tools are visible.
3. Run the bookmarklet.
4. Use the **Extract JSON** button to download tool metadata.

## Limitations

- REST API version check may fail if the iframe is served from a different origin or if the session is not authenticated.
- Only tools with detectable `toolId` are included in the export.

## TODO

- [x] **Get a reliable method for system version**  
  Uses `doc.location.origin` to ensure REST API calls go to the correct domain.

- [ ] **Implement upload and compare**  
  Add functionality to upload a previously exported JSON file and compare tool metadata.

- [ ] **Ignore differences in version where the version strings match their system version**  
  When comparing, skip mismatches if the tool version matches the system version string.