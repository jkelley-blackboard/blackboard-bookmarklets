/**
 * Blackboard Learn IH Children Export (Expanded JS)
 * Endpoint: GET /learn/api/public/v1/institutionalHierarchy/nodes/{nodeId}/children?recursive=true
 * Output: prompted at runtime — one of three formats:
 *         1) Pipe-delimited snapshot (.txt): parent_node_key|external_node_key|name|description
 *         2) JSON (.json): raw REST response node objects, flat array, unmodified (includes id)
 *         3) Word outline (.docx): multilevel numbered list, one line per node as "Name | ExternalId | Description",
 *            list depth = hierarchy depth. Matches the input format expected by Terry Patterson's
 *            Institutional Hierarchy generator (https://blackboard.tools/ih-generator/) — verified against
 *            that tool's sample .docx (list style: hybridMultilevel, numFmt cycling decimal/lowerLetter/lowerRoman
 *            every 3 levels, paragraphs styled "ListParagraph").
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

  /** Filename suffix: Blackboard site hostname + today's date (YYYY-MM-DD), sanitized for use in a filename */
  const FILE_STAMP = `${location.hostname.replace(/[^a-z0-9.-]/gi, '_')}-${new Date().toISOString().slice(0, 10)}`;

  /** Ask at runtime which output format to produce */
  const FORMAT_CHOICES = { '1': 'pipe', '2': 'json', '3': 'docx' };
  const formatInput = prompt(
    "Choose export format:\n\n" +
    "1 = Pipe-delimited snapshot (.txt)\n" +
    "2 = JSON (raw REST response)\n" +
    "3 = Word outline (.docx)",
    "1"
  );
  if (formatInput === null) return; // User cancelled the prompt
  const FORMAT = FORMAT_CHOICES[formatInput.trim()];
  if (!FORMAT) {
    alert(`Invalid selection: "${formatInput}". Please enter 1, 2, or 3.`);
    return;
  }

  /** Pipe-delimited header (no node_id — see file header for per-format id handling) */
  const HEADER = ["parent_node_key", "external_node_key", "name", "description"];

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

  /** Word's built-in multilevel list defines levels 0-8 (9 deep); deeper nodes stay at level 8 */
  const MAX_OUTLINE_LEVEL = 8;

  /** Escape a string for safe embedding as OOXML element text */
  const xmlEscape = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /**
   * Render the node tree as WordprocessingML paragraphs, one per node, each carrying
   * a numPr/ilvl matching its hierarchy depth so Word's multilevel list numbers it
   * 1 / a / i / 1 / ii / iii / b ... (cycling every 3 levels). Paragraph text is
   * "Name | ExternalId | Description" (description omitted when blank), matching the
   * input format expected by https://blackboard.tools/ih-generator/.
   * @param {Array<object>} roots
   * @returns {string} word/document.xml body paragraphs
   */
  function buildDocumentParagraphs(roots){
    const paragraphs = [];
    function walk(node, depth){
      const ilvl = Math.min(depth, MAX_OUTLINE_LEVEL);
      const parts = [];
      if(node.title) parts.push(node.title);
      if(node.externalId) parts.push(node.externalId);
      if(node.description) parts.push(node.description);
      const text = parts.join(' | ');
      const run = text ? `<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>` : '';
      paragraphs.push(
        `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr></w:pPr>${run}</w:p>`
      );
      node.children.forEach(child => walk(child, depth + 1));
    }
    roots.forEach(r => walk(r, 0));
    return paragraphs.join('');
  }

  /** word/document.xml — body of paragraphs plus a minimal section definition */
  function buildDocumentXml(roots){
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + buildDocumentParagraphs(roots) +
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';
  }

  /**
   * word/numbering.xml — a single hybridMultilevel list (numId 1) cycling
   * decimal / lowerLetter / lowerRoman every 3 levels, matching Word's default
   * "1. a. i." multilevel list gallery style (verified against the ih-generator
   * tool's sample .docx).
   */
  function buildNumberingXml(){
    const NUM_FORMATS = ['decimal', 'lowerLetter', 'lowerRoman'];
    let levels = '';
    for(let ilvl = 0; ilvl <= MAX_OUTLINE_LEVEL; ilvl++){
      const fmt = NUM_FORMATS[ilvl % 3];
      const left = 720 * (ilvl + 1);
      const hanging = fmt === 'lowerRoman' ? 180 : 360;
      const jc = fmt === 'lowerRoman' ? 'right' : 'left';
      levels += `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>` +
        `<w:lvlText w:val="%${ilvl + 1}."/><w:lvlJc w:val="${jc}"/>` +
        `<w:pPr><w:ind w:left="${left}" w:hanging="${hanging}"/></w:pPr></w:lvl>`;
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels}</w:abstractNum>` +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
      '</w:numbering>';
  }

  const CONTENT_TYPES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>';

  const ROOT_RELS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const DOCUMENT_RELS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>' +
    '<w:qFormat/><w:pPr><w:contextualSpacing/></w:pPr></w:style>' +
    '</w:styles>';

  /** CRC-32 (used by the ZIP local/central file headers) */
  function crc32(bytes){
    if(!crc32.table){
      const table = new Uint32Array(256);
      for(let n = 0; n < 256; n++){
        let c = n;
        for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
      crc32.table = table;
    }
    let crc = 0xFFFFFFFF;
    for(let i = 0; i < bytes.length; i++) crc = crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  const writeUint16LE = (arr, offset, value) => { arr[offset] = value & 0xFF; arr[offset + 1] = (value >>> 8) & 0xFF; };
  const writeUint32LE = (arr, offset, value) => {
    arr[offset] = value & 0xFF;
    arr[offset + 1] = (value >>> 8) & 0xFF;
    arr[offset + 2] = (value >>> 16) & 0xFF;
    arr[offset + 3] = (value >>> 24) & 0xFF;
  };

  /**
   * Build an uncompressed (store-method) ZIP archive from a set of named byte buffers.
   * A .docx is just such a ZIP, so this — plus the OOXML parts above — is enough to
   * produce a real Word-openable file with no external dependencies.
   * @param {Array<{name: string, data: Uint8Array}>} files
   * @returns {Uint8Array}
   */
  function buildZip(files){
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
    const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);

    const localChunks = [];
    const centralChunks = [];
    let offset = 0;

    files.forEach(file => {
      const nameBytes = encoder.encode(file.name);
      const data = file.data;
      const crc = crc32(data);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      writeUint32LE(localHeader, 0, 0x04034b50);
      writeUint16LE(localHeader, 4, 20);
      writeUint16LE(localHeader, 6, 0);
      writeUint16LE(localHeader, 8, 0);
      writeUint16LE(localHeader, 10, dosTime);
      writeUint16LE(localHeader, 12, dosDate);
      writeUint32LE(localHeader, 14, crc);
      writeUint32LE(localHeader, 18, data.length);
      writeUint32LE(localHeader, 22, data.length);
      writeUint16LE(localHeader, 26, nameBytes.length);
      writeUint16LE(localHeader, 28, 0);
      localHeader.set(nameBytes, 30);
      localChunks.push(localHeader, data);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      writeUint32LE(centralHeader, 0, 0x02014b50);
      writeUint16LE(centralHeader, 4, 20);
      writeUint16LE(centralHeader, 6, 20);
      writeUint16LE(centralHeader, 8, 0);
      writeUint16LE(centralHeader, 10, 0);
      writeUint16LE(centralHeader, 12, dosTime);
      writeUint16LE(centralHeader, 14, dosDate);
      writeUint32LE(centralHeader, 16, crc);
      writeUint32LE(centralHeader, 20, data.length);
      writeUint32LE(centralHeader, 24, data.length);
      writeUint16LE(centralHeader, 28, nameBytes.length);
      writeUint16LE(centralHeader, 30, 0);
      writeUint16LE(centralHeader, 32, 0);
      writeUint16LE(centralHeader, 34, 0);
      writeUint16LE(centralHeader, 36, 0);
      writeUint32LE(centralHeader, 38, 0);
      writeUint32LE(centralHeader, 42, offset);
      centralHeader.set(nameBytes, 46);
      centralChunks.push(centralHeader);

      offset += localHeader.length + data.length;
    });

    const centralOffset = offset;
    const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);

    const end = new Uint8Array(22);
    writeUint32LE(end, 0, 0x06054b50);
    writeUint16LE(end, 8, files.length);
    writeUint16LE(end, 10, files.length);
    writeUint32LE(end, 12, centralSize);
    writeUint32LE(end, 16, centralOffset);

    const zip = new Uint8Array(centralOffset + centralSize + end.length);
    let pos = 0;
    localChunks.forEach(chunk => { zip.set(chunk, pos); pos += chunk.length; });
    centralChunks.forEach(chunk => { zip.set(chunk, pos); pos += chunk.length; });
    zip.set(end, pos);
    return zip;
  }

  /**
   * Assemble the full .docx package (a ZIP of OOXML parts) for the given node tree.
   * @param {Array<object>} roots
   * @returns {Uint8Array}
   */
  function buildDocxPackage(roots){
    const encoder = new TextEncoder();
    return buildZip([
      { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
      { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
      { name: 'word/document.xml', data: encoder.encode(buildDocumentXml(roots)) },
      { name: 'word/_rels/document.xml.rels', data: encoder.encode(DOCUMENT_RELS_XML) },
      { name: 'word/numbering.xml', data: encoder.encode(buildNumberingXml()) },
      { name: 'word/styles.xml', data: encoder.encode(STYLES_XML) },
    ]);
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
        downloadFile(JSON.stringify(nodes, null, 2), `IH-nodes-export-${FILE_STAMP}.json`, 'application/json');
      }else if(FORMAT === 'docx'){
        const roots = buildOutlineTree(nodes);
        const docx = buildDocxPackage(roots);
        downloadFile(docx, `IH-nodes-export-${FILE_STAMP}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }else{
        const rows = await buildRows(nodes);
        downloadFile(rows.join('\n'), `IH-nodes-export-${FILE_STAMP}.txt`, 'text/plain');
      }
    }catch(err){
      console.error(err);
      alert(`Unexpected error: ${err.message}`);
    }
  }

  // Kick-off
  run();
})();