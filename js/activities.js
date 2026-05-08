// js/activities.js
// ─────────────────────────────────────────────────────────────
// Shared utility: fetch activities.json, filter, and render
// a table into any page that calls renderActivitiesTable().
//
// Usage: call renderActivitiesTable(options) where options is:
//   {
//     tbodyId:     (string)   ID of the <tbody> to populate
//     countId:     (string)   ID of the element showing result count
//     noResultsId: (string)   ID of the "no results" message element
//     filterSquare:     (string|null)  if set, only show this Square value
//     filterDiscipline: (string|null)  if set, only show this Discipline
//     filterFramework:  (string|null)  if set, only show this Framework tag
//     pageType:    ('square'|'framework')  controls which columns are shown
//     enableSidebarFilters: (boolean) true on the All Activities page
//   }
// ─────────────────────────────────────────────────────────────

const ACTIVITIES_JSON_PATH = (function() {
  // Find this script's own location, then look for activities.json in the data folder
  // alongside the js folder where this file lives.
  const scriptSrc = document.currentScript ? document.currentScript.src : '';
  if (scriptSrc) {
    return new URL('../data/activities.json', scriptSrc).href;
  }
  // Fallback if document.currentScript isn't available
  return new URL('data/activities.json', document.baseURI).href;
})();

// Capture the script's own URL so we can resolve other site-relative paths later.
const SCRIPT_SRC = (function() {
  return document.currentScript ? document.currentScript.src : '';
})();

function resolveSiteUrl(relativePath) {
  if (!relativePath) return '#';
  if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith('/')) {
    return relativePath;
  }
  if (SCRIPT_SRC) {
    return new URL('../' + relativePath, SCRIPT_SRC).href;
  }
  return relativePath;
}

/**
 * Builds one <tr> element from an activity object.
 * pageType 'square'    → columns: Activity | Discipline | AI Literacy Framework Tags
 * pageType 'framework' → columns: Activity | Square | Discipline
 */
function buildRow(activity, pageType = 'square') {
  const tr = document.createElement('tr');

  tr.dataset.square     = activity.Square;
  tr.dataset.discipline = activity.Discipline;
  tr.dataset.framework  = activity['AI Literacy Framework Tags'].map(t => t.tag).join('|');

  // Column 1: Activity description
  const tdActivity = document.createElement('td');
  tdActivity.textContent = activity.Activity;
  tr.appendChild(tdActivity);

  if (pageType === 'all') {
    // Column 2: Square link
    const tdSquare = document.createElement('td');
    const squareLink = document.createElement('a');
    squareLink.href = resolveSiteUrl(activity.SquareURL);
    squareLink.textContent = activity.Square;
    tdSquare.appendChild(squareLink);
    tr.appendChild(tdSquare);

    // Column 3: Discipline
    const tdDiscipline = document.createElement('td');
    tdDiscipline.textContent = activity.Discipline;
    tr.appendChild(tdDiscipline);

    // Column 4: Framework tags
    const tdFramework = document.createElement('td');
    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    activity['AI Literacy Framework Tags'].forEach(({ tag, url }) => {
      const a = document.createElement('a');
      a.className   = 'tag';
      a.href        = url || '#';
      a.textContent = tag;
      tagList.appendChild(a);
    });
    tdFramework.appendChild(tagList);
    tr.appendChild(tdFramework);

  } else if (pageType === 'framework') {
    // Column 2: Square link
    const tdSquare = document.createElement('td');
    const squareLink = document.createElement('a');
    squareLink.href = resolveSiteUrl(activity.SquareURL);
    squareLink.textContent = activity.Square;
    tdSquare.appendChild(squareLink);
    tr.appendChild(tdSquare);

    // Column 3: Discipline
    const tdDiscipline = document.createElement('td');
    tdDiscipline.textContent = activity.Discipline;
    tr.appendChild(tdDiscipline);

  } else {
    // pageType === 'square' (default)

    // Column 2: Discipline
    const tdDiscipline = document.createElement('td');
    tdDiscipline.textContent = activity.Discipline;
    tr.appendChild(tdDiscipline);

    // Column 3: Framework tags
    const tdFramework = document.createElement('td');
    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    activity['AI Literacy Framework Tags'].forEach(({ tag, url }) => {
      const a = document.createElement('a');
      a.className   = 'tag';
      a.href        = url || '#';
      a.textContent = tag;
      tagList.appendChild(a);
    });
    tdFramework.appendChild(tagList);
    tr.appendChild(tdFramework);
  }

  return tr;
}

/**
 * Main function — fetch JSON, filter, render, wire up sidebar filters.
 */
async function renderActivitiesTable(options) {
  const {
    tbodyId,
    countId,
    noResultsId,
    filterSquare         = null,   // FIX: was 'filtersquares' (wrong case + typo)
    filterDiscipline     = null,
    filterFramework      = null,
    pageType             = 'square', // FIX: now accepted and passed to buildRow
    enableSidebarFilters = false
  } = options;

  const tbody     = document.getElementById(tbodyId);
  const countEl   = document.getElementById(countId);
  const noResults = document.getElementById(noResultsId);

  // Show a loading state while fetching
  tbody.innerHTML = '<tr><td colspan="4">Loading activities…</td></tr>';

  let allActivities = [];

  try {
    const response = await fetch(ACTIVITIES_JSON_PATH);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    allActivities = await response.json();
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="4">Could not load activities. Please try refreshing.</td></tr>';
    console.error('Failed to load activities.json:', err);
    return;
  }

// Resolve relative URLs (like "squares/create.html") against the site root,
// not against whatever folder the calling page lives in.
function resolveSiteUrl(relativePath) {
  if (!relativePath) return '#';
  // If it's already absolute, leave it alone
  if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith('/')) {
    return relativePath;
  }
  // Anchor against the script's location (js/), then go up one level
  const scriptSrc = document.currentScript ? document.currentScript.src : '';
  if (scriptSrc) {
    return new URL('../' + relativePath, scriptSrc).href;
  }
  // Fallback
  return relativePath;
}

  // Apply any hard-coded page-level filters (e.g., square page only shows one Square)
  let filtered = allActivities.filter(activity => {
    // FIX: was activity.squares — correct property is activity.Square
    if (filterSquare && activity.Square !== filterSquare) return false;
    if (filterDiscipline && activity.Discipline !== filterDiscipline) return false;
    // FIX: was .includes(filterFramework) on an array of objects — must check tag property
    if (filterFramework &&
        !activity['AI Literacy Framework Tags'].some(t => t.tag === filterFramework)) return false;
    return true;
  });

  // Render all (page-level-filtered) rows into the tbody
  tbody.innerHTML = '';
  // FIX: now passes pageType so buildRow shows correct columns per page
  filtered.forEach(activity => {
    tbody.appendChild(buildRow(activity, pageType));
  });

  const total = filtered.length;

  // Update count display
  function updateCount(visibleCount, activeFilters) {
    if (!countEl) return;
    countEl.textContent = activeFilters === 0
      ? `Showing all ${total} activities`
      : `Showing ${visibleCount} of ${total} activities`;
  }

  // ── Sidebar filter logic (All Activities page only) ──────
  if (enableSidebarFilters) {
    const checkboxes = document.querySelectorAll('.filter-cb');
    const clearBtn   = document.getElementById('clear-filters-btn');

    function getSelected(col) {
      return Array.from(
        document.querySelectorAll(`.filter-cb[data-col="${col}"]:checked`)
      ).map(cb => cb.value);
    }

    function applyFilters() {
      const squareFilters     = getSelected('square');      // FIX: was 'squares'
      const disciplineFilters = getSelected('discipline');
      const frameworkFilters  = getSelected('framework');
      const activeFilters     =
        squareFilters.length + disciplineFilters.length + frameworkFilters.length;

      let visibleCount = 0;
      const rows = tbody.querySelectorAll('tr');

      rows.forEach(row => {
        // FIX: was row.dataset.squares — correct dataset key is row.dataset.square
        const matchSquare = squareFilters.length === 0 ||
          squareFilters.includes(row.dataset.square);

        const matchDiscipline = disciplineFilters.length === 0 ||
          disciplineFilters.includes(row.dataset.discipline);

        const matchFramework = frameworkFilters.length === 0 || (() => {
          const rowFrameworks = row.dataset.framework.split('|');
          return frameworkFilters.some(f => rowFrameworks.includes(f));
        })();

        const show = matchSquare && matchDiscipline && matchFramework;
        row.classList.toggle('hidden-row', !show);
        if (show) visibleCount++;
      });

      updateCount(visibleCount, activeFilters);
      if (noResults) {
        noResults.classList.toggle('visible', visibleCount === 0);
      }
    }

    checkboxes.forEach(cb => cb.addEventListener('change', applyFilters));

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        checkboxes.forEach(cb => { cb.checked = false; });
        applyFilters();
      });
    }

    // Run once on load
    applyFilters();

  } else {
    // No sidebar — just show the count
    updateCount(total, 0);
    if (noResults) {
      noResults.classList.toggle('visible', total === 0);
    }
  }
}
