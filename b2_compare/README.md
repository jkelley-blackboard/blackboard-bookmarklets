# B2 Export Utility Bookmarklet

This bookmarklet provides a lightweight interface for extracting installed Building Block (B2) tool data from the Blackboard **Admin > Tools > Installed Tools** page. It displays system context, allows JSON export of tool metadata, includes a REST API version check, and supports upload-and-compare functionality.

## Features

- Extracts tool metadata from the Installed Tools page
- Displays system context including hostname, Blackboard version, and timestamp
- Fetches system version via REST API (`/learn/api/public/v1/system/version`)
- Exports data as a downloadable JSON file
- Upload a previously exported JSON file and compare with current tools
  - Highlights mismatches, missing, and extra tools
  - Ignores version mismatches when the tool version matches the system version
  - Optionally ignores tool ID differences on different hosts
- Copy mismatch report to clipboard or download as JSON
- UI panel with styled buttons and context display

## Requirements

- Must be run from the **Admin > Tools > Installed Tools** page in Blackboard
- The "Show All" option must be enabled on the page

## Usage

1. Navigate to **Admin > Tools > Installed Tools** in Blackboard.
2. Click **Show All** to ensure all tools are visible.
3. Run the bookmarklet.
4. Use the **Extract JSON** button to download current tool metadata.
5. Use the **Upload & Compare** button to:
   - Upload a previously exported JSON file
   - Compare tool metadata against the current system
   - View mismatches, missing, and extra tools
   - Copy the mismatch report to clipboard or download as JSON

## Notes

- **Missing tools**: Tools present in the uploaded file but not on the current system
- **Extra tools**: Tools present in the current system but not in the uploaded file
- **Mismatched tools**: Tools present in both but with differences in version, support status, or availability

## Limitations

- Only tools with detectable `toolId` are included in the export.
- Comparison ignores version differences if the version matches the system version.
