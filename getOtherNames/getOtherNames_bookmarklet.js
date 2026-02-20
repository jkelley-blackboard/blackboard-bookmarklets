/**
 * Blackboard Learn — Export Users with "Other" Names (Expanded JS)
 * Endpoint: GET /learn/api/public/v1/users?fields=userName,name.given,name.other,lastLogin&lastLogin={date}&limit=200
 *
 * Prompts for a lastLogin cutoff date (YYYY-MM-DD). Returns all users who logged in
 * on or after that date (API default: greaterOrEqual) and have name.other populated.
 * Follows paging.nextPage until all results are collected, then downloads a CSV.
 *
 * Output: userName,firstName,otherName (comma-separated, with header)
 *
 * Note on CORS: Ultra pages may be served from a CDN origin (e.g. ultra.content.blackboardcdn.com)
 * which differs from the actual Learn hostname. To avoid CORS preflight failures, API calls
 * use relative paths so the browser always targets the current page origin, and any absolute
 * URLs returned in paging.nextPage are rewritten to use relative paths too.
 *
 * Auth: Relies on existing session cookies (credentials: 'include'). If your Learn site
 *       enforces OAuth for REST, calls will fail with 401/403. In that case, obtain an
 *       OAuth token first and pass it via Authorization header.
 *
 * References:
 * - Users endpoint: GET /learn/api/public/v1/users
 * - lastLoginCompare defaults to 'greaterOrEqual' if not specified
 * - Basic Authentication with REST: https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication
 */
(async function () {
  const LEARN_PATH = '/learn/api/public/v1';

  /** Small delay to be friendly to the server */
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /** Fetch wrapper using session cookies.
   *  Always uses a relative path to avoid CORS issues on Ultra CDN pages. */
  const get = (url) => {
    // Strip any absolute origin from the URL so the request stays same-origin
    const relative = url.replace(/^https?:\/\/[^/]+/, '');
    return fetch(relative, {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });
  };

  /**
   * Follow REST paging until all results are collected.
   * @param {string} url - initial URL to fetch (absolute or relative)
   * @returns {Promise<object[]>} combined results array
   */
  async function fetchPaged(url) {
    const all = [];
    let next = url;
    for (let i = 0; i < 2000 && next; i++) {
      const res = await get(next);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.results)) all.push(...data.results);
      next = (data.paging && data.paging.nextPage) ? data.paging.nextPage : null;
      await sleep(50);
    }
    return all;
  }

  /** Trigger download of content as a CSV file */
  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: filename
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Main */
  try {
    const date = prompt('Enter lastLogin cutoff date (YYYY-MM-DD):', '2026-01-01');
    if (!date) return;

    const url = `${LEARN_PATH}/users?fields=userName,name.given,name.other,lastLogin&lastLogin=${encodeURIComponent(date)}&limit=200`;
    const users = await fetchPaged(url);

    const withOther = users.filter(u => u.name && u.name.other);

    if (!withOther.length) {
      alert('No users found with an "other" name.');
      return;
    }

    const rows = ['userName,firstName,otherName'];
    for (const u of withOther) {
      rows.push(`${u.userName},${u.name.given || ''},${u.name.other}`);
    }

    downloadCSV(rows.join('\n'), `blackboard-other-names-${date}.csv`);
    alert(`Done. ${withOther.length} users with "other" names exported.`);

  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
  }
})();
