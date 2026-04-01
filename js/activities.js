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
//     filtersquares:(string|null)  if set, only show this squares value
//     filterDiscipline: (string|null) if set, only show this Discipline
//     filterFramework:  (string|null) if set, only show this Framework tag
//     enableSidebarFilters: (boolean) true on the All Activities page
//   }
// ─────────────────────────────────────────────────────────────

const ACTIVITIES_JSON_PATH = new URL('../data/activities.json', document.baseURI).href;

// Framework tag values mapped to their page URLs
const FRAMEWORK_URLS = {
  'Career Competencies':        'frameworks/career_competencies.html',
  'Communication & Collaboration': 'frameworks/communication_&_collaboration.html',
  'Content Creation':           'frameworks/content_creation.html',
  'Hardware & Software':        'frameworks/hardware_&_software.html',
  'Information & Data Literacy':'frameworks/information_&_data_literacy.html',
  'Critical Thinking & Agency': 'frameworks/creative_thinking_&_agency.html',
  'Safety & Ethics':            'frameworks/safety.html'
};

/**
 * Builds one <tr> element from an activity object.
 * pageType 'square'    → columns: Activity | Square | Discipline | Framework Tags
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

  // Column 2: Square link
  const tdSquare = document.createElement('td');
  const squareLink = document.createElement('a');
  squareLink.href        = activity.SquareURL || '#';
  squareLink.textContent = activity.Square;
  tdSquare.appendChild(squareLink);
  tr.appendChild(tdSquare);

  // Column 3: Discipline — plain text, no link
  const tdDiscipline = document.createElement('td');
  tdDiscipline.textContent = activity.Discipline;
  tr.appendChild(tdDiscipline);

  // Column 4: Framework tags — only shown on square pages
  if (pageType === 'square') {
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
    filtersquares       = null,
    filterDiscipline   = null,
    filterFramework    = null,
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

  // Apply any hard-coded page-level filters (e.g., squares page only shows one squares)
  let filtered = allActivities.filter(activity => {
    if (filtersquares && activity.squares !== filtersquares) return false;
    if (filterDiscipline && activity.Discipline !== filterDiscipline) return false;
    if (filterFramework &&
        !activity['AI Literacy Framework Tags'].includes(filterFramework)) return false;
    return true;
  });

  // Render all (page-level-filtered) rows into the tbody
  tbody.innerHTML = '';
  filtered.forEach(activity => {
    tbody.appendChild(buildRow(activity));
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
      const squaresFilters     = getSelected('squares');
      const disciplineFilters = getSelected('discipline');
      const frameworkFilters  = getSelected('framework');
      const activeFilters     =
        squaresFilters.length + disciplineFilters.length + frameworkFilters.length;

      let visibleCount = 0;
      const rows = tbody.querySelectorAll('tr');

      rows.forEach(row => {
        const matchsquares = squaresFilters.length === 0 ||
          squaresFilters.includes(row.dataset.squares);

        const matchDiscipline = disciplineFilters.length === 0 ||
          disciplineFilters.includes(row.dataset.discipline);

        const matchFramework = frameworkFilters.length === 0 || (() => {
          const rowFrameworks = row.dataset.framework.split('|');
          return frameworkFilters.some(f => rowFrameworks.includes(f));
        })();

        const show = matchsquares && matchDiscipline && matchFramework;
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
