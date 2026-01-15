# Blackboard Other Names Extractor

A bookmarklet to extract users with "other" names from Blackboard Learn using the REST API.

## Overview

This bookmarklet queries the Blackboard Learn REST API to find all users who have an "other" name field populated and have logged in since a specified date. It automatically handles pagination and exports the results as a CSV file.

## Features

- Prompts for a date filter (users with lastLogin after specified date)
- Automatically handles pagination for datasets larger than 100 records
- Filters for users with populated "other" names
- Exports results as CSV with columns: `userName`, `firstName`, `name.other`
- Downloads file automatically with date-stamped filename


## Usage

1. Log into your Blackboard Learn instance
2. Navigate to any page within Blackboard (must be logged in with API access)
3. Click the bookmarklet in your bookmarks
4. Enter a date in YYYY-MM-DD format (e.g., `2026-01-01`)
5. Wait for processing to complete
6. CSV file will automatically download

## Output Format

The CSV file will contain three columns:
```csv
userName,firstName,name.other
jdoe123,John,Johnny
asmith456,Alice,Ally
```

## API Endpoint

The bookmarklet uses the following Blackboard Learn REST API endpoint:
```
/learn/api/public/v1/users?fields=lastLogin,name.given,name.other,userName&lastLogin={date}&limit=100&offset={offset}
```

## Requirements

- Blackboard Learn instance with REST API enabled
- User account with appropriate API permissions to query user data
- Modern browser with support for:
  - `fetch` API
  - `async/await`
  - Blob API
  - ES6 template literals

## Permissions

This bookmarklet requires:
- Read access to Blackboard Learn REST API
- Permission to query user information
- Access to user name fields and login data

## Troubleshooting

### "HTTP 401" or "HTTP 403" Error
- Verify you're logged into Blackboard
- Check that your account has API access permissions
- Contact your Blackboard administrator

### "No users found with 'other' names"
- Verify the date format is correct (YYYY-MM-DD)
- Check that users in your system have the "other" name field populated
- Try a earlier date to expand the search range

### CORS Errors
- Ensure you're running the bookmarklet from within the Blackboard domain

