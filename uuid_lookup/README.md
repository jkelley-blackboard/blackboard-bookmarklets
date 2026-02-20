# Blackboard Learn UUID Lookup (Bookmarklet & Script)

Looks up the internal **UUID** for a list of usernames by calling the Blackboard Learn REST API:

```
GET /learn/api/public/v1/users/userName:{username}?fields=uuid
```

This repository provides:

- A **one-line bookmarklet** you can save in your browser to download the results as a text file.
- An **expanded JavaScript file** you can run in the browser console or adapt as needed.

---

## Usage

1. Log into your Blackboard Learn instance.
2. Click the bookmarklet (or paste the expanded script into the browser console).
3. A **file picker** opens — select your input file.
4. A **prompt** asks for the output format (see below).
5. Results download as `bb-uuid-lookup.txt`. Any usernames not found are listed in an alert.

---

## Input Format

A plain text file of `userName` values — either one per line:

```
jkelley
jkelley_instructor
student_jkelley
```

or comma-separated:

```
jkelley,jkelley_instructor,student_jkelley
```

---

## Output Format

Chosen interactively via prompt when the bookmarklet runs:

**Option 1 — `userName|uuid`** (pipe-delimited, one per line):
```
jkelley|_123_1
jkelley_instructor|_456_1
student_jkelley|_789_1
```

**Option 2 — uuid only** (one per line):
```
_123_1
_456_1
_789_1
```

Usernames that are not found are excluded from the output file and listed in the completion alert.

---

## Auth

Relies on existing session cookies (`credentials: 'include'`). No API token or OAuth setup required — just run the bookmarklet while logged into Blackboard.

If your institution enforces OAuth for REST API calls, requests will fail with 401/403. In that case, obtain a token first and pass it via an `Authorization` header.

Reference: [Basic Authentication with REST](https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication)

---

## Known Limitations & Notes

- **Rate limiting:** An 80ms delay between requests keeps things polite. Increase if you encounter throttling on large lists.
- **Not-found reporting:** Any username returning a non-OK HTTP response (404, 401, 403, etc.) is excluded from the output file and listed in the completion alert.
- **Special characters in usernames:** Values are passed through `encodeURIComponent` before use in the URL.
