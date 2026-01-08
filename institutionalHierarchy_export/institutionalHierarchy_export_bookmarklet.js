
/**
 * Blackboard Learn IH Children Export (Expanded JS)
 * Endpoint: GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
 * Output: parent_node_key|external_node_key|name|description (pipe-delimited, no quotes)
 *
 * Auth: Relies on existing session cookies (credentials: 'include'). If your Learn site enforces OAuth for REST,
 *       calls will fail with 401/403. In that case, obtain an OAuth token first and pass it via Authorization header.
 *
 * References:
 * - Basic Authentication with REST: https://blackboard.github.io/rest-apis/learn/getting-started/basic-authentication
 * - Building Blocks and REST APIs overview: https://help.blackboard.com/Learn/Administrator/SaaS/Integrations/Compare_Building_Blocks_and_Rest
 * - IH children endpoint examples (Postman): https://www.postman.com/insead-apis/higher-ed-rest-apis/request/fgxfzq1/blackboard-get-node-children
 */
(function(){
  const START_NODE_ID = "_1_1"; // Fixed starting nodeId per requirements
  const BASE = location.origin;
  const OUTPUT_FILENAME = `ih-children-${START_NODE_ID}.txt`;
  const HEADER = ["parent_node_key","external_node_key","name","description"]; // pipe-delimited header

  /** Small delay to be friendly to the server */
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /** Fetch wrapper using session cookies */
  const get = (url) => fetch(url, { credentials: 'include' });

  /**
   * Follow REST paging until completion.
   * @param {string} url - initial URL to fetch
   * @returns {Promise<Array<object>>} combined results
   */
  async function fetchPaged(url){
    const all = [];
    let next = url;
    for(let i=0; i<2000 && next; i++){
      const res = await get(next);
      if(!res.ok){
        alert(`GET failed ${res.status} @ ${next}`);
        break;
      }
      const data = await res.json();
      if(Array.isArray(data.results)) all.push(...data.results);
      next = (data.paging && data.paging.nextPage)
        ? (data.paging.nextPage.startsWith('http') ? data.paging.nextPage : (BASE + data.paging.nextPage))
        : null;
      await sleep(50);
    }
    return all;
  }

  /** Node cache to avoid repeated fetches */
  const nodeCache = new Map();

  /**
   * Fetch a single node (details used to resolve parent externalId).
   * @param {string} nodeId
   * @returns {Promise<object|undefined>}
   */
  async function fetchNode(nodeId){
    if(nodeCache.has(nodeId)) return nodeCache.get(nodeId);
    const url = `${BASE}/learn/api/public/v1/institutionalHierarchy/nodes/${encodeURIComponent(nodeId)}`;
    const res = await get(url);
    if(!res.ok){
      // Parent may be outside visibility or blocked by entitlements; return undefined
      return undefined;
    }
    const obj = await res.json();
    nodeCache.set(nodeId, obj);
    return obj;
  }

  /**
   * Build pipe-delimited rows from children list, resolving parent externalId.
   * @param {Array<object>} nodes
   * @returns {Promise<string[]>} rows including header
   */
  async function buildRows(nodes){
    // Prime cache for faster parent lookups later
    for(const n of nodes){ nodeCache.set(n.id, n); }
    const rows = [HEADER.join('|')];
    for(const n of nodes){
      let parentKey = '';
      if(n.parentId){
        const p = await fetchNode(n.parentId);
        parentKey = (p && p.externalId) ? p.externalId : '';
      }
      const externalKey = n.externalId || '';
      const name = n.title || '';
      const description = n.description || '';
      rows.push([parentKey, externalKey, name, description].join('|'));
    }
    return rows;
  }

  /** Trigger download of the content as a file */
  function downloadText(lines){
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: OUTPUT_FILENAME
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Main */
  async function run(){
    try{
      const childrenUrl = `${BASE}/learn/api/public/v1/institutionalHierarchy/nodes/${encodeURIComponent(START_NODE_ID)}/children?recursive=true&limit=200&offset=0`;
      const nodes = await fetchPaged(childrenUrl);
      if(!nodes.length){
        alert('No descendants returned (or auth blocked).');
        return;
      }
      const rows = await buildRows(nodes);
      downloadText(rows);
    }catch(err){
      console.error(err);
      alert(`Unexpected error: ${err.message}`);
    }
  }

  // Kick-off
  run();
})();
