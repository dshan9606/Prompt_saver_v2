// popup.hardened.js — Prompt Manager with Categories (Save + Filter)
// ------------------------------------------------------------------
// New in this version:
// - Category support: save a prompt under a category; filter list by category
// - Persistent category list in chrome.storage.local (key: "categories")
// - Backward compatibility: old prompts get category "Uncategorized" on first load
// - Import validation updated to accept optional "category" (string)
//
// Data model for a prompt:
// {
//   id: string,                // crypto.randomUUID()
//   title: string,
//   tags: string[],
//   text: string,
//   category: string,          // NEW (e.g., "SDLC", "Control Testing")
//   createdAt: string          // ISO timestamp
// }

const DEFAULT_CATEGORY = 'Uncategorized';
const NEW_CATEGORY_SENTINEL = '__NEW__';

// -------------------------
// Utility: HTML escape (prevents XSS)
// -------------------------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// -------------------------
// Utility: Basic schema validation for imported prompts
// -------------------------
function isPromptLike(o) {
  return (
    o &&
    (typeof o.id === 'string' || typeof o.id === 'number') &&
    typeof o.title === 'string' &&
    Array.isArray(o.tags) && o.tags.every(t => typeof t === 'string') &&
    typeof o.text === 'string' &&
    (typeof o.category === 'undefined' || typeof o.category === 'string') &&
    (typeof o.createdAt === 'string' || typeof o.createdAt === 'undefined')
  );
}

// -------------------------
// Storage helpers for categories
// -------------------------
async function getCategories() {
  const res = await chrome.storage.local.get(['categories']);
  const list = Array.isArray(res.categories) ? res.categories : [];
  // Ensure DEFAULT_CATEGORY exists
  if (!list.includes(DEFAULT_CATEGORY)) list.unshift(DEFAULT_CATEGORY);
  return [...new Set(list)];
}

async function setCategories(list) {
  const unique = [...new Set(list.filter(Boolean).map(c => c.trim()))];
  if (!unique.includes(DEFAULT_CATEGORY)) unique.unshift(DEFAULT_CATEGORY);
  await chrome.storage.local.set({ categories: unique });
  return unique;
}

async function ensureCategory(cat) {
  const name = (cat || '').trim() || DEFAULT_CATEGORY;
  const list = await getCategories();
  if (!list.includes(name)) {
    list.push(name);
    await setCategories(list);
  }
  return name;
}

// -------------------------
// Populate category selects
// -------------------------
async function populateCategoryControls() {
  const list = await getCategories();

  // Save tab select
  const saveSelect = document.getElementById('prompt-category');
  if (saveSelect) {
    saveSelect.innerHTML = '';
    for (const c of list) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      saveSelect.appendChild(opt);
    }
    // Add "Add new…" option
    const optNew = document.createElement('option');
    optNew.value = NEW_CATEGORY_SENTINEL;
    optNew.textContent = '➕ Add new…';
    saveSelect.appendChild(optNew);
  }

  // View tab filter select
  const filterSelect = document.getElementById('filter-category');
  if (filterSelect) {
    const current = filterSelect.value || '';
    filterSelect.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All categories';
    filterSelect.appendChild(allOpt);

    for (const c of list) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterSelect.appendChild(opt);
    }
    // restore previous selection if possible
    if ([...filterSelect.options].some(o => o.value === current)) {
      filterSelect.value = current;
    }
  }
}

// -------------------------
// Tabs switching
// -------------------------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const panel = document.getElementById(`${tabName}-tab`);
    if (panel) panel.classList.add('active');

    if (tabName === 'view') {
      populateCategoryControls();
      loadPrompts(getSearchTerm(), getSelectedCategory());
    }
    if (tabName === 'manage') {
      updateStats();
    }
  });
});

// -------------------------
// Helpers to read current UI filters
// -------------------------
function getSearchTerm() {
  const el = document.getElementById('search-input');
  return (el?.value ?? '').trim();
}
function getSelectedCategory() {
  const el = document.getElementById('filter-category');
  return (el?.value ?? '');
}

// -------------------------
// Save prompt
// -------------------------
document.getElementById('save-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titleEl = document.getElementById('prompt-title');
  const tagsEl = document.getElementById('prompt-tags');
  const textEl = document.getElementById('prompt-text');
  const catSel = document.getElementById('prompt-category');
  const newCatEl = document.getElementById('new-category');

  const title = (titleEl?.value ?? '').trim();
  const tagsInput = (tagsEl?.value ?? '').trim();
  const text = (textEl?.value ?? '').trim();

  if (!title || !text) {
    alert('Title and Text are required.');
    return;
  }

  // Resolve category (existing or new)
  let category = (catSel?.value ?? '').trim();
  if (category === NEW_CATEGORY_SENTINEL) {
    const typed = (newCatEl?.value ?? '').trim();
    if (!typed) {
      alert('Please enter a new category name.');
      return;
    }
    category = typed;
  }
  category = await ensureCategory(category);

  const prompt = {
    id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    title,
    tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
    text,
    category,
    createdAt: new Date().toISOString()
  };

  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    prompts.unshift(prompt);
    await chrome.storage.local.set({ prompts });

    // Feedback
    const successMsg = document.getElementById('success-message');
    if (successMsg) {
      successMsg.classList.add('show');
      setTimeout(() => successMsg.classList.remove('show'), 3000);
    }

    // Reset form
    document.getElementById('save-form').reset();

    // Re-populate categories to include any newly added one
    await populateCategoryControls();
    // Auto-switch to View? (optional)
    // loadPrompts('', category);
  } catch (err) {
    console.error('Error saving prompt:', err);
    alert('An error occurred while saving. Please try again.');
  }
});

// -------------------------
// Toggle "new category" field visibility
// -------------------------
document.getElementById('prompt-category')?.addEventListener('change', (e) => {
  const showNew = e.target.value === NEW_CATEGORY_SENTINEL;
  const newCatEl = document.getElementById('new-category');
  if (newCatEl) newCatEl.style.display = showNew ? '' : 'none';
});

// -------------------------
// Load & display prompts with optional search + category
// -------------------------
async function loadPrompts(searchTerm = '', category = '') {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    let prompts = result?.prompts || [];

    // BACKFILL: ensure every prompt has a category; persist if we changed anything
    let mutated = false;
    prompts = prompts.map(p => {
      if (!p.category) { mutated = true; return { ...p, category: DEFAULT_CATEGORY }; }
      return p;
    });
    if (mutated) await chrome.storage.local.set({ prompts });

    // Apply filters
    const search = (searchTerm || '').toLowerCase();
    const filtered = prompts.filter(p => {
      const matchesText =
        String(p.title || '').toLowerCase().includes(search) ||
        String(p.text || '').toLowerCase().includes(search) ||
        (Array.isArray(p.tags) && p.tags.some(tag => String(tag || '').toLowerCase().includes(search)));
      const matchesCategory = !category || String(p.category || DEFAULT_CATEGORY) === category;
      return matchesText && matchesCategory;
    });

    const listEl = document.getElementById('prompt-list');
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="empty">
          <div class="emoji">📝</div>
          <div>${searchTerm || category ? 'No prompts found.' : 'No prompts saved yet.<br/>Start by saving your first prompt!'}</div>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(prompt => `
      <div class="prompt-card">
        <div class="prompt-header">
          <div class="prompt-title">${escapeHtml(prompt.title || '')}</div>
          <div>
            <span class="pill">${escapeHtml(prompt.category || DEFAULT_CATEGORY)}</span>
            ${prompt.tags?.length
              ? `<span class="pill">${prompt.tags.map(t => `#${escapeHtml(t)}`).join(' ')}</span>`
              : ''
            }
          </div>
        </div>
        <pre class="prompt-text">${escapeHtml(prompt.text || '')}</pre>
        <div class="prompt-actions">
          <button class="btn btn-copy" data-id="${escapeHtml(String(prompt.id))}" aria-label="Copy prompt">📋 Copy</button>
          <button class="btn btn-delete" data-id="${escapeHtml(String(prompt.id))}" aria-label="Delete prompt">🗑️ Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => copyPrompt(btn.getAttribute('data-id')));
    });

    listEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deletePrompt(btn.getAttribute('data-id')));
    });
  } catch (err) {
    console.error('Error loading prompts:', err);
    alert('Could not load prompts. Please reopen the popup.');
  }
}

// -------------------------
// Search + Category filter handlers
// -------------------------
document.getElementById('search-input')?.addEventListener('input', () => {
  loadPrompts(getSearchTerm(), getSelectedCategory());
});
document.getElementById('filter-category')?.addEventListener('change', () => {
  loadPrompts(getSearchTerm(), getSelectedCategory());
});

// -------------------------
// Copy to clipboard
// -------------------------
async function copyPrompt(id) {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    const prompt = prompts.find(p => String(p.id) == String(id));
    if (!prompt) return;

    await navigator.clipboard.writeText(prompt.text || '');

    const btn = document.querySelector(`[data-id="${CSS.escape(String(id))}"].btn-copy`);
    if (!btn) return;

    const originalText = btn.textContent;
    const originalBg = btn.style.background;
    btn.textContent = '✓ Copied!';
    btn.style.background = '#45a049';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg;
    }, 1600);
  } catch (err) {
    console.error('Clipboard error:', err);
    alert('Could not copy to clipboard. Please try again.');
  }
}

// -------------------------
// Delete a single prompt
// -------------------------
async function deletePrompt(id) {
  if (!confirm('Are you sure you want to delete this prompt?')) return;
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    const filtered = prompts.filter(p => String(p.id) !== String(id));
    await chrome.storage.local.set({ prompts: filtered });
    loadPrompts(getSearchTerm(), getSelectedCategory());
  } catch (err) {
    console.error('Delete error:', err);
    alert('Could not delete the prompt. Please try again.');
  }
}

// -------------------------
// Update Manage stats
// -------------------------
async function updateStats() {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    const countEl = document.getElementById('prompt-count');
    if (countEl) countEl.textContent = String(prompts.length);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// -------------------------
// Export
// -------------------------
document.getElementById('export-btn')?.addEventListener('click', async () => {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    const dataStr = JSON.stringify(prompts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    alert('Could not export prompts.');
  }
});

// -------------------------
// Import (merge) + categories union
// -------------------------
document.getElementById('import-btn')?.addEventListener('click', () => {
  document.getElementById('import-file')?.click();
});

document.getElementById('import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported) || !imported.every(isPromptLike)) {
        alert('Invalid file format or content. Expected an array of prompt objects.');
        return;
      }

      // Backfill missing category to DEFAULT_CATEGORY before merging
      const normalized = imported.map(p => ({ ...p, category: p.category?.trim() || DEFAULT_CATEGORY }));

      const result = await chrome.storage.local.get(['prompts', 'categories']);
      const existing = result?.prompts || [];

      // Merge prompts unique by id; prefer existing (local) over imported on conflict
      const map = new Map();
      for (const p of existing) map.set(String(p.id), p);
      for (const p of normalized) if (!map.has(String(p.id))) map.set(String(p.id), p);
      const merged = Array.from(map.values());

      // Size guard (approx) to avoid storage quota issues
      const approxBytes = new Blob([JSON.stringify(merged)]).size;
      const MAX_SAFE_BYTES = 4.5 * 1024 * 1024; // ~4.5 MB headroom
      if (approxBytes > MAX_SAFE_BYTES) {
        alert('Import too large for local storage. Consider splitting the file.');
        return;
      }

      await chrome.storage.local.set({ prompts: merged });

      // Merge categories
      const importedCats = [...new Set(normalized.map(p => p.category))];
      const currentCats = await getCategories();
      await setCategories([...currentCats, ...importedCats]);

      updateStats();
      await populateCategoryControls();
      alert(`Successfully imported ${normalized.length} prompts!`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing file: ' + (err?.message || String(err)));
    }
  };

  reader.readAsText(file);
  e.target.value = ''; // allow re-selecting same file later
});

// -------------------------
// Clear All
// -------------------------
document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete ALL prompts? This cannot be undone!')) return;
  try {
    await chrome.storage.local.set({ prompts: [] });
    updateStats();
    loadPrompts('', '');
    alert('All prompts cleared!');
  } catch (err) {
    console.error('Clear-all error:', err);
    alert('Could not clear prompts. Please try again.');
  }
});

// -------------------------
// Initialize
// -------------------------
(async function init() {
  // Ensure categories are present (seed a few helpful ones)
  const seeds = [DEFAULT_CATEGORY, 'SDLC', 'Control Testing', 'IAM', 'BCP/DR'];
  const current = await getCategories();
  await setCategories([...current, ...seeds]);

  await populateCategoryControls();
  await loadPrompts('', '');
  await updateStats();
})();
