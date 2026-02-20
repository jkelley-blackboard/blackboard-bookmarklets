/**
 * Blackboard Learn UUID Lookup from File (Expanded JS)
 * Endpoint: GET /learn/api/public/v1/users/userName:{username}?fields=uuid
 *
 * Input file format — no header, one per line or comma-separated:
 *   jkelley
 *   jkelley_instructor
 *   student_jkelley
 *   -- or --
 *   jkelley,jkelley_instructor,student_jkelley
 *
 * Output options (chosen via prompt):
 *   1 = userName|uuid  (pipe-delimited, one per line)
 *   2 = uuid only      (one per line)
 *
 * Not-found usernames are listed in an alert after download.
 *
 * Auth: Relies on existing session cookies (credentials: 'include'). If your Learn site
 *       enforces OAuth for REST, calls will fail with 401/403. In that case, obtain an
 *       OAuth token first and pass it via Authorization header.
 *
 * References:
 * - Users endpoint: GET /learn/api/public/v1/users/userName:{userName}?fields=uuid
 * - Basic Authentication with REST: https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication
 */
(function () {
  const BASE = location.origin;
  const OUTPUT_FILENAME = 'bb-uuid-lookup.txt';

  /** Small delay to be friendly to the server */
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /** Fetch only the uuid field for a given userName */
  const fetchUser = (username) =>
    fetch(`${BASE}/learn/api/public/v1/users/userName:${encodeURIComponent(username)}?fields=uuid`, {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });

  /**
   * Parse input text into a flat list of usernames.
   * Accepts one-per-line or comma-separated (or both mixed).
   * @param {string} text
   * @returns {string[]}
   */
  function parseUsernames(text) {
    return text
      .split(/[\r\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Open a file picker and return the selected File.
   * @returns {Promise<File|null>}
   */
  function pickFile() {
    return new Promise(resolve => {
      const input = Object.assign(document.createElement('input'), {
        type: 'file',
        accept: '.txt,.csv'
      });
      input.onchange = () => resolve(input.files[0] || null);
      input.oncancel  = () => resolve(null);
      input.click();
    });
  }

  /**
   * Read a File as text.
   * @param {File} file
   * @returns {Promise<string>}
   */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  }

  /**
   * Prompt the user to choose an output format.
   * @returns {'pair'|'uuid'|null} null if cancelled
   */
  function pickOutputFormat() {
    const answer = prompt('Output format?\n\n1 = userName|uuid\n2 = uuid only\n\nEnter 1 or 2:');
    if (answer === '1') return 'pair';
    if (answer === '2') return 'uuid';
    return null;
  }

  /** Trigger download of lines as a text file */
  function downloadText(lines) {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: OUTPUT_FILENAME
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Main */
  async function run() {
    try {
      // Step 1: pick file
      const file = await pickFile();
      if (!file) return;

      const text = await readFile(file);
      const usernames = parseUsernames(text);
      if (!usernames.length) { alert('No usernames found in file.'); return; }

      // Step 2: choose output format
      const format = pickOutputFormat();
      if (!format) { alert('Cancelled.'); return; }

      // Step 3: look up each user
      const outputRows = [];
      const notFound = [];

      for (const username of usernames) {
        try {
          const res = await fetchUser(username);
          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            const uuid = data.uuid || '';
            outputRows.push(format === 'pair' ? `${username}|${uuid}` : uuid);
          } else {
            notFound.push(username);
          }
        } catch (err) {
          notFound.push(username);
        }

        await sleep(80);
      }

      // Step 4: download results
      downloadText(outputRows);

      // Step 5: report not-found
      const found = usernames.length - notFound.length;
      if (notFound.length) {
        alert(`Done. ${found} found, ${notFound.length} not found.\n\nNot found:\n${notFound.join('\n')}`);
      } else {
        alert(`Done. All ${found} usernames found.`);
      }

    } catch (err) {
      console.error(err);
      alert(`Unexpected error: ${err.message}`);
    }
  }

  run();
})();
