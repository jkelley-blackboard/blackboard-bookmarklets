# Blackboard LMS Test Extractor (Bookmarklet)

Extracts **question-level results** and **question analysis** for Blackboard LMS tests by calling internal and public REST APIs:

```
GET  /learn/api/v1/courses/{courseId}/gradebook/columns
GET  /learn/api/v1/courses/{courseId}/contents/{contentId}
POST /learn/api/v1/courses/{courseId}/questionAnalysis/assessments/{assessmentId}
GET  /learn/api/v1/courses/{courseId}/gradebook/columns/{columnId}/results/export
```

This repository provides:

- A **one-line bookmarklet** you can save in your browser to extract and download test data.
- An **expanded JavaScript file** you can read, adapt, or run in the browser console.

---

## Usage

1. Log into your Blackboard LMS instance and navigate to any course.
2. Click the bookmarklet.
3. A **panel** appears in the top-right corner listing all tests found in the course gradebook.
4. **Select** one or more tests using the checkboxes.
5. Click **▶ Extract Selected**.
6. Each test is processed sequentially. When complete, **↓ CSV** and **↓ JSON** download buttons appear per test.
7. If multiple tests were extracted, a **↓ Download All** button appears to download all files at once.

---

## Output Files

### `{CourseName}_{TestName}_results.csv`

A direct pass-through of Blackboard's question-level results export, with two columns prepended:

| Column | Description |
|---|---|
| `course_id` | Human-readable course name |
| `test_name` | Human-readable test name |
| `Username` | Student username |
| `Last Name` | Student last name |
| `First Name` | Student first name |
| `Full Name` | Student full name |
| `Question ID` | Question number within the test |
| `Question` | Question text |
| `Answer` | Student's answer |
| `Possible Points` | Points available for the question |
| `Auto Score` | Auto-graded score |
| `Manual Score` | Manually assigned score |
| `Grading Status` | e.g. `Posted`, `NeedsGrading` |

Rows with no `Question ID` are "Additional Content" blocks — these are preserved as-is from the BB export.

### `{CourseName}_{TestName}_analysis.json`

Question analysis data from Blackboard's analytics engine, including:

- **Summary stats:** submissions, average score, average duration, difficulty and discrimination distributions
- **Per-question stats:** question type, average score, difficulty, discrimination index, standard deviation, quartile distributions

---

## How Tests Are Identified

The bookmarklet uses the internal v1 gradebook columns endpoint (not the public endpoint, which returns a stripped schema). Tests are distinguished from Assignments using the `assessmentSubtype` field:

- **Tests:** `scoreProviderHandle === "resource/x-bb-assessment"` and `assessmentSubtype` is absent
- **Assignments:** same handle but `assessmentSubtype === "Assignment"`

Manual columns and other item types are excluded by the absence of `scoreProviderHandle`.

---

## Auth

Relies on existing session cookies (`credentials: 'include'`). No API token or OAuth setup required — just run the bookmarklet while logged into Blackboard.

The XSRF token required for the analysis POST is retrieved automatically from `/webapps/login/` at extract time.

---

## Known Limitations & Notes

- **No submissions:** If a test has no student attempts, the analysis POST returns `400` and the CSV will be empty. This is expected — the bookmarklet will show `✗ 400` for that test.
- **Demo/SaaS instances:** Tested against `demo.blackboard.com` running Blackboard Ultra SaaS. The internal v1 endpoint schema may differ on self-hosted or older instances.
- **Sequential processing:** Tests are extracted one at a time to avoid hammering the server. Within each test, the analysis poll and results export run concurrently.
- **Analysis timeout:** The question analysis engine has a 60-second timeout (40 polls × 1.5s). Large tests with many attempts may occasionally time out and need to be re-run.
- **UTF-16LE encoding:** The results export endpoint returns `text/csv;charset=UTF-16LE`. This is handled automatically by the bookmarklet using `TextDecoder`.
