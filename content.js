(() => {
  'use strict';
  // ── State ──────────────────────────────────────────────────
  let currentSortCol = null;   // 'name' | 'message' | 'date'
  let currentSortDir = null;   // 'asc' | 'desc'
  // ── Helpers ────────────────────────────────────────────────
  /**
   * GitHub's file table uses 4 <th> columns:
   *   [0] Name (icon only, hidden on wider viewports duplicate)
   *   [1] Name (text, the visible one)
   *   [2] Last commit message
   *   [3] Last commit date
   *
   * Data rows each have matching <td> cells.  The first <tr> in
   * <tbody> is the ".." parent-directory row — we leave it pinned
   * at the top and only sort the file/folder rows beneath it.
   */
  function getFileTable() {
    // The file list table lives inside the main content area.
    // There's only one <table> on a repo tree page.
    return document.querySelector(
      'table.Box-sc-g0xbh4-0, table[class*="DirectoryContent"], main table'
    );
  }
  function ensureThead(table) {
    const existing = table.querySelector('thead');
    if (existing) {
      // GitHub sometimes hides the thead (height: 0) — force it visible
      existing.classList.add('ghfs-visible-thead');
      return;
    }
    // No thead at all — inject one
    const firstRow = table.querySelector('tbody tr');
    if (!firstRow) return;
    const colCount = firstRow.children.length;
    if (colCount < 4) return;
    const thead = document.createElement('thead');
    thead.classList.add('ghfs-injected-thead', 'ghfs-visible-thead');
    const tr = document.createElement('tr');
    const labels = ['', 'Name', 'Last commit message', 'Last commit date'];
    for (let i = 0; i < colCount; i++) {
      const th = document.createElement('th');
      th.textContent = labels[i] || '';
      if (i === 0) th.style.width = '0';
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.insertBefore(thead, table.firstChild);
  }
  function getHeaderCells(table) {
    ensureThead(table);
    const ths = table.querySelectorAll('thead th');
    // Return the three sortable ones by index
    return {
      name: ths[1],     // visible "Name" column
      message: ths[2],  // "Last commit message"
      date: ths[3]      // "Last commit date"
    };
  }
  function getDataRows(table) {
    const allRows = Array.from(table.querySelectorAll('tbody tr'));
    // Separate pinned rows (parent ".." link and "Latest commit" bar) from sortable file rows
    const pinnedRows = [];
    const fileRows = [];
    for (const row of allRows) {
      const text = row.textContent;
      if (text.includes('..') && row.querySelector('a[href]')?.textContent.trim() === '..') {
        pinnedRows.push(row);
      } else if (row.querySelector('td[colspan="3"]') || row.classList.toString().includes('DirectoryContent')) {
        // Latest commit bar — has a full-width colspan'd cell or DirectoryContent class
        pinnedRows.push(row);
      } else {
        fileRows.push(row);
      }
    }
    return { pinnedRows, fileRows };
  }
  // ── Sorting comparators ────────────────────────────────────
  function compareName(a, b) {
    // Use the second <td> (index 1) which holds the visible file name
    const aName = (a.children[1]?.textContent || '').trim().toLowerCase();
    const bName = (b.children[1]?.textContent || '').trim().toLowerCase();
    // Directories first, then alphabetical
    const aIsDir = isDirectory(a);
    const bIsDir = isDirectory(b);
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return aName.localeCompare(bName);
  }
  function isDirectory(row) {
    return !!row.querySelector('svg.icon-directory, [aria-label="Directory"]');
  }
  function compareMessage(a, b) {
    const aIsDir = isDirectory(a);
    const bIsDir = isDirectory(b);
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    const aMsg = (a.children[2]?.textContent || '').trim().toLowerCase();
    const bMsg = (b.children[2]?.textContent || '').trim().toLowerCase();
    return aMsg.localeCompare(bMsg);
  }
  function compareDate(a, b) {
    const aIsDir = isDirectory(a);
    const bIsDir = isDirectory(b);
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    const aTime = a.children[3]?.querySelector('relative-time');
    const bTime = b.children[3]?.querySelector('relative-time');
    const aDate = aTime ? new Date(aTime.getAttribute('datetime')).getTime() : 0;
    const bDate = bTime ? new Date(bTime.getAttribute('datetime')).getTime() : 0;
    return aDate - bDate;
  }
  const COMPARATORS = {
    name: compareName,
    message: compareMessage,
    date: compareDate
  };
  // ── Core sort function ─────────────────────────────────────
  function sortTable(colKey, direction) {
    const table = getFileTable();
    if (!table) return;
    const { pinnedRows, fileRows } = getDataRows(table);
    if (fileRows.length === 0) return;
    const cmp = COMPARATORS[colKey];
    if (!cmp) return;
    fileRows.sort((a, b) => {
      // Always keep directories first, regardless of sort direction
      const aIsDir = isDirectory(a);
      const bIsDir = isDirectory(b);
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      // Apply direction only to the column comparison
      const result = cmp(a, b);
      return direction === 'desc' ? -result : result;
    });
    const tbody = table.querySelector('tbody');
    // Re-insert: pinned rows first, then sorted file rows
    pinnedRows.forEach(row => tbody.appendChild(row));
    fileRows.forEach(row => tbody.appendChild(row));
    // Update visual state on headers
    const headers = getHeaderCells(table);
    Object.entries(headers).forEach(([key, th]) => {
      if (!th) return;
      th.classList.remove('ghfs-sort-asc', 'ghfs-sort-desc');
      if (key === colKey) {
        th.classList.add(direction === 'asc' ? 'ghfs-sort-asc' : 'ghfs-sort-desc');
      }
    });
    currentSortCol = colKey;
    currentSortDir = direction;
  }
  // ── Attach click handlers to headers ───────────────────────
  // Unique ID per script instance — survives extension reloads
  const INSTANCE_ID = 'ghfs-' + Date.now();
  function initSortHeaders() {
    const table = getFileTable();
    if (!table || table.dataset.ghfsSortInit === INSTANCE_ID) return;
    table.dataset.ghfsSortInit = INSTANCE_ID;
    const headers = getHeaderCells(table);
    Object.entries(headers).forEach(([colKey, th]) => {
      if (!th) return;
      th.classList.add('ghfs-sortable');
      // Clone-replace to remove any stale listeners from old script instances
      const fresh = th.cloneNode(true);
      th.parentNode.replaceChild(fresh, th);
      fresh.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let dir = 'asc';
        if (currentSortCol === colKey) {
          dir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else if (colKey === 'date') {
          dir = 'desc';
        }
        sortTable(colKey, dir);
      });
    });
  }
  // ── Auto-sort from settings ────────────────────────────────
  function datesReady(table) {
    const times = table.querySelectorAll('tbody relative-time');
    if (times.length === 0) return false;
    return Array.from(times).some(t => t.getAttribute('datetime'));
  }
  function applyDefaultSort() {
    chrome.storage.sync.get(
      { autoSortEnabled: false, autoSortColumn: 'date', autoSortDirection: 'desc' },
      (settings) => {
        if (!settings.autoSortEnabled) return;
        const table = getFileTable();
        if (!table) return;
        // If sorting by date, wait for relative-time elements to load
        if (settings.autoSortColumn === 'date' && !datesReady(table)) {
          let attempts = 0;
          const waitForDates = setInterval(() => {
            attempts++;
            if (datesReady(table) || attempts > 20) {
              clearInterval(waitForDates);
              sortTable(settings.autoSortColumn, settings.autoSortDirection);
            }
          }, 250);
        } else {
          sortTable(settings.autoSortColumn, settings.autoSortDirection);
        }
      }
    );
  }
  // ── File Tree: dates & sorting ─────────────────────────────
  function parseRepoInfo() {
    const m = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (!m) return null;
    const owner = m[1], repo = m[2];
    // Try to get the branch/ref from GitHub's embedded page data or DOM
    let branch = null;
    // 1. Check for data embedded in the page by GitHub (most reliable for branches with slashes)
    try {
      const embeddedScript = document.querySelector('script[data-target="react-app.embeddedData"]')
        || document.querySelector('[data-target="react-app.reactRoot"] script[type="application/json"][data-target="react-partial.embeddedData"]');
      if (embeddedScript) {
        const data = JSON.parse(embeddedScript.textContent);
        branch = data?.payload?.codeViewLayoutRoute?.refInfo?.name
          || data?.props?.initialPayload?.refInfo?.name
          || data?.payload?.refInfo?.name
          || data?.props?.initialPayload?.ref;
      }
    } catch {}
    // 2. Check the branch picker button text
    if (!branch) {
      const branchBtn = document.querySelector('#branch-picker-repos-header-ref-selector button span');
      if (branchBtn) branch = branchBtn.textContent.trim();
    }
    // 3. Fall back to URL parsing (works for simple branch names)
    if (!branch) {
      const urlMatch = location.pathname.match(/^\/[^/]+\/[^/]+\/(?:tree|blob)\/([^/]+)/);
      branch = urlMatch ? urlMatch[1] : 'main';
    }
    return { owner, repo, branch };
  }
  function relativeDate(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd';
    const months = Math.floor(days / 30);
    if (months < 12) return months + 'mo';
    return Math.floor(months / 12) + 'y';
  }
  const treeCommitCache = {};
  async function fetchTreeCommitInfo(owner, repo, branch, dirPath) {
    const key = `${owner}/${repo}/${branch}/${dirPath}`;
    if (treeCommitCache[key]) return treeCommitCache[key];
    try {
      const url = `/${owner}/${repo}/tree-commit-info/${branch}/${dirPath}`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) return null;
      const data = await resp.json();
      treeCommitCache[key] = data;
      return data;
    } catch { return null; }
  }
  function isTreeDir(item) {
    return item.getAttribute('aria-expanded') !== null;
  }
  function getTreeItemName(item) {
    const textSpan = item.querySelector('[class*="content-text"]');
    return textSpan ? textSpan.textContent.trim() : '';
  }
  async function processTreeLevel(parentUl, owner, repo, branch, dirPath) {
    const items = Array.from(parentUl.children).filter(
      li => li.getAttribute('role') === 'treeitem'
    );
    if (items.length === 0) return;
    const commitInfo = await fetchTreeCommitInfo(owner, repo, branch, dirPath);
    if (!commitInfo) return;
    // Add dates and collect sort data
    const sortData = [];
    for (const item of items) {
      const name = getTreeItemName(item);
      const info = commitInfo[name];
      const dateVal = info ? new Date(info.date).getTime() : 0;
      // Inject date label inside the content div (which is already flex)
      const contentDiv = item.querySelector('[class*="item-content"]');
      if (contentDiv && !contentDiv.querySelector('.ghfs-tree-date')) {
        const dateLabel = document.createElement('span');
        dateLabel.className = 'ghfs-tree-date';
        dateLabel.textContent = info ? relativeDate(info.date) : '';
        dateLabel.title = info ? new Date(info.date).toLocaleString() : '';
        contentDiv.appendChild(dateLabel);
      }
      sortData.push({ item, name, dateVal, isDir: isTreeDir(item) });
    }
    // Sort: folders first, then newest first
    sortData.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return b.dateVal - a.dateVal; // newest first
    });
    // Re-order DOM
    for (const { item } of sortData) {
      parentUl.appendChild(item);
    }
  }
  async function initFileTree() {
    const tree = document.querySelector('nav[aria-label="File Tree Navigation"] [role="tree"]');
    if (!tree || tree.dataset.ghfsTreeInit === INSTANCE_ID) return;
    tree.dataset.ghfsTreeInit = INSTANCE_ID;
    const info = parseRepoInfo();
    if (!info) return;
    // Process root level
    await processTreeLevel(tree, info.owner, info.repo, info.branch, '');
    // Process any already-expanded nested groups (e.g. when viewing a file deep in the tree)
    const expandedGroups = tree.querySelectorAll('[role="group"]');
    for (const group of expandedGroups) {
      const parentItem = group.closest('[role="treeitem"]');
      if (!parentItem) continue;
      let path = getTreeItemName(parentItem);
      let ancestor = parentItem.parentElement?.closest('[role="treeitem"]');
      while (ancestor) {
        path = getTreeItemName(ancestor) + '/' + path;
        ancestor = ancestor.parentElement?.closest('[role="treeitem"]');
      }
      await processTreeLevel(group, info.owner, info.repo, info.branch, path);
    }
    // Watch for folder expansions to process sub-levels
    let isProcessingTree = false;
    async function processSubList(subList) {
      // Wait for child items to be populated
      const hasItems = () => subList.querySelector('[role="treeitem"]');
      if (!hasItems()) {
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 150));
          if (hasItems()) break;
        }
      }
      if (!hasItems()) return;
      // Skip if all items already have dates (nothing to do)
      const items = subList.querySelectorAll(':scope > [role="treeitem"]');
      if (items.length > 0 && Array.from(items).every(i => i.querySelector('.ghfs-tree-date'))) return;
      const parentItem = subList.closest('[role="treeitem"]');
      if (!parentItem) return;
      let path = getTreeItemName(parentItem);
      let ancestor = parentItem.parentElement?.closest('[role="treeitem"]');
      while (ancestor) {
        path = getTreeItemName(ancestor) + '/' + path;
        ancestor = ancestor.parentElement?.closest('[role="treeitem"]');
      }
      isProcessingTree = true;
      await processTreeLevel(subList, info.owner, info.repo, info.branch, path);
      isProcessingTree = false;
    }
    let treeDebounceTimer = null;
    const pendingGroups = new Set();
    const treeObserver = new MutationObserver((mutations) => {
      if (isProcessingTree) return;
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== 1) continue;
          // New group (folder expansion)
          const subList = node.matches?.('[role="group"]') ? node : node.querySelector?.('[role="group"]');
          if (subList) pendingGroups.add(subList);
          // New/replaced treeitem in existing group (GitHub re-render)
          if (node.matches?.('[role="treeitem"]') && !node.querySelector('.ghfs-tree-date')) {
            const group = node.closest('[role="group"]');
            if (group) pendingGroups.add(group);
          }
        }
      }
      if (pendingGroups.size === 0) return;
      clearTimeout(treeDebounceTimer);
      treeDebounceTimer = setTimeout(async () => {
        const groups = [...pendingGroups];
        pendingGroups.clear();
        for (const g of groups) {
          await processSubList(g);
        }
      }, 200);
    });
    treeObserver.observe(tree, { childList: true, subtree: true });
  }
  // ── Initialization ─────────────────────────────────────────
  let lastInitUrl = null;

  function init() {
    const table = getFileTable();
    if (table) {
      initSortHeaders();
      applyDefaultSort();
    }
    initFileTree();
    lastInitUrl = location.href;
  }

  function getFileTree() {
    return document.querySelector('nav[aria-label="File Tree Navigation"] [role="tree"]');
  }
  function initWithRetry() {
    let attempts = 0;
    function tryInit() {
      if (getFileTable() || getFileTree()) {
        init();
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryInit, 200);
      }
    }
    tryInit();
  }

  function observePageChanges() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWithRetry);
    } else {
      initWithRetry();
    }

    // MutationObserver — catch DOM replacements
    const observer = new MutationObserver(() => {
      const table = getFileTable();
      if (table && !table.dataset.ghfsSortInit) {
        setTimeout(init, 150);
      }
    });
    const main = document.querySelector('main') || document.body;
    observer.observe(main, { childList: true, subtree: true });

    // Turbo events
    document.addEventListener('turbo:load', () => setTimeout(initWithRetry, 150));
    document.addEventListener('turbo:render', () => setTimeout(initWithRetry, 150));

    // GitHub's soft-nav event
    document.addEventListener('soft-nav:end', () => setTimeout(initWithRetry, 150));

    // URL polling fallback — catches any nav method we missed
    setInterval(() => {
      if (location.href !== lastInitUrl) {
        initWithRetry();
      }
    }, 500);
  }

  observePageChanges();
})();