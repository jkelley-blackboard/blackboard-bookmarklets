/**
 * Blackboard Learn IH Children Export (Expanded JS)
 * Endpoint: GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
 * Output: prompted at runtime — one of three formats:
 *         1) Pipe-delimited snapshot (.txt): parent_node_key|external_node_key|name|description
 *            Optional extra column: node_id (_nnn_1 format) — prompted at runtime
 *         2) JSON (.json): raw REST response node objects, flat array, unmodified
 *         3) Word-compatible outline (.rtf) — nested headings, node_id also optional here
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

  /** Ask at runtime which output format to produce */
  const FORMAT_CHOICES = { '1': 'pipe', '2': 'json', '3': 'rtf' };
  const formatInput = prompt(
    "Choose export format:\n\n" +
    "1 = Pipe-delimited snapshot (.txt)\n" +
    "2 = JSON (raw REST response)\n" +
    "3 = RTF outline for Word (.rtf)",
    "1"
  );
  if (formatInput === null) return; // User cancelled the prompt
  const FORMAT = FORMAT_CHOICES[formatInput.trim()];
  if (!FORMAT) {
    alert(`Invalid selection: "${formatInput}". Please enter 1, 2, or 3.`);
    return;
  }

  /** Ask at runtime whether to include the node_id column/annotation (pipe + rtf only; JSON already has it) */
  const INCLUDE_NODE_ID = (FORMAT === 'pipe' || FORMAT === 'rtf') && confirm(
    "Include node_id (_nnn_1 format)?\n\n" +
    "Useful for building ALLY_NODE_ institutional role IDs.\n\n" +
    "OK = Yes, include node_id\n" +
    "Cancel = Standard export (no node_id)"
  );

  /** Build header based on user choice (pipe format only) */
  const HEADER = INCLUDE_NODE_ID
    ? ["parent_node_key", "external_node_key", "name", "description", "node_id"]
    : ["parent_node_key", "external_node_key", "name", "description"];

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
   * Extract the _nnn_1 formatted ID from a node's id field.
   * The REST API returns id as "_957_1" — we use it directly.
   * @param {object} node
   * @returns {string}
   */
  function getNodePkId(node){
    return (node && node.id) ? node.id : '';
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

      const fields = [parentKey, externalKey, name, description];
      if(INCLUDE_NODE_ID) fields.push(getNodePkId(n));

      rows.push(fields.join('|'));
    }
    return rows;
  }

  /** Trigger download of the content as a file */
  function downloadFile(content, filename, mimeType){
    const blob = new Blob([content], { type: mimeType });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: filename
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /**
   * Escape a string for safe embedding in RTF text, encoding non-ASCII
   * characters as \uN? sequences per the RTF spec.
   * @param {string} str
   * @returns {string}
   */
  function rtfEscape(str){
    let out = '';
    for(const ch of String(str)){
      const code = ch.codePointAt(0);
      if(ch === '\\' || ch === '{' || ch === '}'){
        out += '\\' + ch;
      }else if(code < 0x80){
        out += ch;
      }else{
        const signed = code > 0x7fff ? code - 0x10000 : code;
        out += `\\u${signed}?`;
      }
    }
    return out;
  }

  /**
   * Reassemble the flat descendant list into a parent/child tree rooted
   * at the direct children of START_NODE_ID.
   * @param {Array<object>} nodes
   * @returns {Array<object>} root nodes, each with a `children` array
   */
  function buildOutlineTree(nodes){
    const byId = new Map();
    nodes.forEach(n => byId.set(n.id, Object.assign({}, n, { children: [] })));
    const roots = [];
    byId.forEach(n => {
      if(n.parentId && byId.has(n.parentId)){
        byId.get(n.parentId).children.push(n);
      }else{
        roots.push(n);
      }
    });
    return roots;
  }

  /** Word supports outline levels 0-8 (Heading 1-9); deeper nodes stay at level 8 */
  const MAX_OUTLINE_LEVEL = 8;

  /**
   * Render the node tree as RTF paragraphs with per-depth outline levels,
   * so Word's Outline view can promote/demote/collapse the hierarchy.
   * @param {Array<object>} roots
   * @returns {string} RTF body content
   */
  function renderOutlineBody(roots){
    const lines = [];
    function walk(node, depth){
      const level = Math.min(depth, MAX_OUTLINE_LEVEL);
      const indent = depth * 360; // twips (~0.25in per level)
      const sizeHalfPoints = Math.max(20, 32 - depth * 2); // shrink font per depth, floor at 10pt
      let title = node.title || node.externalId || '(untitled)';
      if(INCLUDE_NODE_ID) title += ` [${getNodePkId(node)}]`;
      lines.push(`{\\pard\\outlinelevel${level}\\li${indent}\\b\\fs${sizeHalfPoints} ${rtfEscape(title)}\\b0\\fs22\\par}`);
      if(node.description){
        lines.push(`{\\pard\\outlinelevel9\\li${indent + 180}\\i\\fs20 ${rtfEscape(node.description)}\\i0\\fs22\\par}`);
      }
      node.children.forEach(child => walk(child, depth + 1));
    }
    roots.forEach(r => walk(r, 0));
    return lines.join('\n');
  }

  /**
   * Wrap rendered outline paragraphs in a minimal RTF document shell.
   * TODO: needs more testing — verify in real Microsoft Word (outline levels,
   * promote/demote, deep hierarchies 10+ levels, non-ASCII names/descriptions).
   * @param {Array<object>} roots
   * @returns {string} full RTF document text
   */
  function buildOutlineDocument(roots){
    const body = renderOutlineBody(roots);
    return '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033\n' +
      '{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}\n' +
      '{\\info{\\title Institutional Hierarchy Outline}}\n' +
      '\\viewkind1\\uc1\\pard\\f0\\fs22\n' +
      body + '\n}';
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
      if(FORMAT === 'json'){
        downloadFile(JSON.stringify(nodes, null, 2), `ih-children-${START_NODE_ID}.json`, 'application/json');
      }else if(FORMAT === 'rtf'){
        const roots = buildOutlineTree(nodes);
        const rtf = buildOutlineDocument(roots);
        downloadFile(rtf, `ih-outline-${START_NODE_ID}.rtf`, 'application/rtf');
      }else{
        const rows = await buildRows(nodes);
        downloadFile(rows.join('\n'), `ih-children-${START_NODE_ID}.txt`, 'text/plain');
      }
    }catch(err){
      console.error(err);
      alert(`Unexpected error: ${err.message}`);
    }
  }

  // Kick-off
  run();
})();