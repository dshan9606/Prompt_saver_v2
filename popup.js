
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

const DEFAULT_WORKFLOWS = [
  {
    id: 'itc-qa-3step',
    name: 'IT Control Test QA (3-step)',
    category: 'Control Testing',
    variables: [
      { key: 'control_name', label: 'Control Name' },
      { key: 'control_id', label: 'Control ID' },
      { key: 'test_period', label: 'Test Period' }
    ],
    steps: [
      {
        title: 'Step 1: Test Evidence Request',
        template: `For control "{control_name}" (ID: {control_id}), please provide the following test evidence for the period {test_period}:

1. Documentation of the control design and operating procedures
2. Sample of control execution records
3. Any exceptions or deviations noted during the period
4. Remediation actions taken for any identified issues

Please organize the evidence by date and include relevant screenshots or system exports.`
      },
      {
        title: 'Step 2: Evidence Review & Analysis',
        template: `Review the evidence provided for control "{control_name}" (ID: {control_id}) for period {test_period}:

Analysis checklist:
- Verify completeness of documentation
- Check for proper authorization and approval
- Validate timing of control execution
- Assess effectiveness of control design
- Identify any control gaps or weaknesses

Document findings with specific references to evidence items.`
      },
      {
        title: 'Step 3: Test Conclusion & Reporting',
        template: `Based on the evidence review for control "{control_name}" (ID: {control_id}) during {test_period}:

Test Conclusion:
- Control Design: [Effective/Needs Improvement]
- Operating Effectiveness: [Effective/Needs Improvement]
- Sample Size: [X items tested]
- Exceptions Found: [Number and description]

Recommendations:
[List any recommended improvements or remediation actions]

Overall Assessment: [Pass/Pass with Exceptions/Fail]`
      }
    ]
  },
  {
    id: 'slod-credible-challenge',
    name: 'Issue & RP – SLOD Credible Challenge',
    category: 'Risk & Compliance',
    variables: [
      { key: 'source', label: 'Issue source (Global Audit / Regulator / etc.)' },
      { key: 'issue_rating', label: 'Issue rating' }
    ],
    steps: [
      {
        title: 'Step 1: Initial Review & Context Gathering',
        template: `I have attached:
- The Issue PDF from Archer GRC
- The Remediation Plan (RP) PDF from Archer GRC
- Supporting evidence files

This is a {source} issue rated {issue_rating}.

Please perform an initial review and provide:

A) Issue summary
   - Root cause (in 2–3 sentences)
   - Original control gap or deficiency
   - Potential consumer impact if left unaddressed

B) Remediation Plan summary
   - Key actions taken or planned
   - Timeline and milestones
   - Responsible parties (1LOD owner, 2LOD oversight)

C) Evidence overview
   - List the types of evidence provided (e.g., policy documents, system screenshots, test results, training records)
   - Note any obvious gaps in evidence at first glance

D) Initial questions for deeper analysis
   - What additional context or evidence would help assess whether the RP fully addresses the root cause?
   - Are there any red flags or areas of concern in the RP or evidence?`
      },
      {
        title: 'Step 2: Deep Dive Analysis & Testing',
        template: `Based on the Issue and RP for this {source} issue rated {issue_rating}, please perform a detailed analysis:

A) Root cause validation
   - Does the RP correctly identify and address the true root cause?
   - Are there any underlying systemic issues not addressed?

B) Control design assessment
   - Evaluate the design of new/updated controls
   - Are they appropriate for the risk level ({issue_rating})?
   - Do they align with regulatory expectations and industry best practices?

C) Evidence sufficiency and quality
   - Is the evidence complete, relevant, and reliable?
   - Does it demonstrate effective implementation and operation of the remediation?
   - Are there any gaps or inconsistencies?

D) Testing and validation
   - What testing has been performed (e.g., walkthroughs, sample testing, UAT)?
   - Are the test results sufficient to conclude the control is operating effectively?
   - Recommend any additional testing needed

E) Sustainability and monitoring
   - Are there ongoing monitoring mechanisms in place?
   - Is there a plan for periodic review and continuous improvement?
   - What is the risk of regression?

F) Consumer impact and outcomes
   - How does the remediation improve consumer outcomes?
   - Are there measurable improvements or KPIs?`
      },
      {
        title: 'Step 3: SLOD Conclusion & Recommendation',
        template: `Based on the comprehensive review of this {source} issue rated {issue_rating}, provide:

A) Overall assessment
   - Summarize the effectiveness of the Remediation Plan
   - Rate the quality of evidence provided (Strong / Adequate / Weak)
   - Assess the likelihood of sustainable remediation

B) Residual risk evaluation
   - What residual risks remain after remediation?
   - Is the residual risk within the organization's risk appetite?
   - Are there any dependencies or assumptions that could affect the outcome?

C) SLOD recommendation
   - Choose and justify one of:
     • Support closure now
     • Do not support closure – further remediation and/or evidence required
     • Support partial closure with documented residual Risk Acceptance
   - Provide a 4–8 bullet "SLOD-ready" justification, explicitly referencing:
     • Residual risk level vs risk appetite
     • Strength of the new/updated control environment
     • Consumer outcome
     • Confidence in sustainability of the fix

D) Required follow-ups and escalations
   - List any:
     • Specific additional evidence/tests you would require
     • Items you would escalate to ERM, Risk Pillar Committee, or appropriate governance forums`
      }
    ]
  },
  {
    id: 'slod-not-able-to-test',
    name: 'SLOD Review – Not Able to Test',
    category: 'Control Testing',
    variables: [
      { key: 'control_name', label: 'Control Name' },
      { key: 'control_description', label: 'Control description / objective' },
      { key: 'reason_not_testable', label: 'FLOD reason for Not Able to Test' },
      { key: 'period', label: 'Intended test period / population' },
      { key: 'testing_guidance', label: 'Key Procedure excerpts (optional)' }
    ],
    steps: [
      {
        title: 'Step 1 — Initial Review & Procedure Alignment',
        template: `You are a SLOD / IT Risk Advisor reviewing a control test that has been marked **Not Able to Test** by the First Line of Defense (FLOD).

Your role is to perform a credible challenge to determine whether this outcome is acceptable under the **Control Testing Procedure 2024** and the organization's risk appetite.

Control context:
- Control: {control_name}
- Control description / objective:
  {control_description}
- FLOD reason for Not Able to Test:
<<<
{reason_not_testable}
>>>

- Intended test period / population:
  {period}

- Key Procedure excerpts (if provided):
<<<
{testing_guidance}
>>>

Tasks:

1) Summarize the control and its role
   - What is this control meant to do?
   - What risk(s) does it mitigate?
   - What is the inherent risk level if this control fails or is absent?

2) Assess the stated reason for Not Able to Test
   - Does the reason align with one of the acceptable categories in the Control Testing Procedure 2024?
     (e.g., control not yet implemented, control design changed mid-period, insufficient population, system unavailability, etc.)
   - Is the explanation clear, specific, and well-documented?
   - Are there any red flags or vague statements that need clarification?

3) Identify what evidence or documentation you would expect to see
   - What should FLOD have provided to support this Not Able to Test conclusion?
   - Is there evidence of attempts to test, or documentation of the barrier?
   - Are there any workarounds, compensating controls, or interim measures in place?

4) List initial questions or concerns
   - What additional information do you need from FLOD?
   - Are there any process or design issues that contributed to this outcome?
   - Is this a one-time occurrence, or part of a pattern?

Output:
- A structured summary addressing each of the four tasks above
- Highlight any gaps or areas requiring follow-up before proceeding to Step 2`.trim()
      },
      {
        title: 'Step 2 — Deep Dive – Validity & Risk Assessment',
        template: `You are continuing your SLOD review of a control test marked **Not Able to Test**.

Assume you have completed Step 1 and gathered initial context.

Control context:
- Control: {control_name}
- Control description / objective:
  {control_description}
- FLOD reason for Not Able to Test:
<<<
{reason_not_testable}
>>>

- Intended test period / population:
  {period}

- Key Procedure excerpts used for your review:
<<<
{testing_guidance}
>>>

Tasks:

1) Validate the legitimacy of the Not Able to Test outcome
   - Is the stated reason truly a barrier to testing, or could alternative testing methods have been used?
   - Does the Control Testing Procedure 2024 explicitly allow for this scenario?
   - Are there precedents or similar controls that were tested despite similar challenges?

2) Assess the risk implications
   - What is the residual risk to the organization given that this control was not tested?
   - Is there a compensating control or alternate assurance mechanism in place?
   - Does the risk level warrant escalation or additional scrutiny?

3) Evaluate FLOD's response and documentation quality
   - Did FLOD provide sufficient detail and supporting evidence?
   - Is there a clear plan to address the root cause (e.g., control redesign, system fix, process improvement)?
   - Are there timelines and accountabilities for resolving the issue?

4) Determine whether an Issue should be raised
   - Does this Not Able to Test outcome represent a control deficiency that requires formal tracking?
   - Should this be documented as an Issue in Archer GRC?
   - What would be the appropriate severity/rating if an Issue is warranted?

5) Consider alternative outcomes
   - Could this be reclassified as:
     - Ineffective (if the control is fundamentally broken),
     - Delayed test (if it's a timing issue),
     - Control inactivation (if the control is no longer relevant or operational)?
   - What would need to be true for each alternative?

Output:
- A detailed analysis addressing each of the five tasks above
- A preliminary view on whether you would support the Not Able to Test conclusion
- Specific conditions or actions required (e.g., "Support, but only with additional documentation / issue", "Do not support – should be treated as ineffective / redesign in progress")`.trim()
      },
      {
        title: 'Step 3 — SLOD Recommendation & Audit-Ready Summary',
        template: `You are finalizing your SLOD / IT Risk view on a control test marked **Not Able to Test**, and need to produce an **audit-ready summary and recommendation**.

Assume you have completed your review in Steps 1 and 2.

Reviewer context:
- Control: {control_name}
- Control description / objective:
  {control_description}
- FLOD reason for Not Able to Test:
<<<
{reason_not_testable}
>>>

- Intended test period / population:
  {period}

- Key Procedure excerpts used for your review:
<<<
{testing_guidance}
>>>

Tasks:

1) Summarize the situation in plain language
   - Briefly restate:
     - What the control is meant to do.
     - Why the test was marked Not Able to Test.
     - The inherent risk level and significance of this control.

2) Provide a clear SLOD recommendation
   - Choose one of the following and justify:
     - Support Not Able to Test as documented (with or without minor documentation enhancements).
     - Support Not Able to Test **only with conditions**, such as:
       - Creation/update of an Issue,
       - Formal Risk Acceptance,
       - Specific documentation changes,
       - Commitment to a near-term retest or redesign.
     - Do **not** support Not Able to Test – reclassify as:
       - Ineffective control (with Issue),
       - Control inactivation plus alternate mitigation,
       - Or a standard delayed test (with updated scheduling and due dates).

3) Highlight what would need to be true in the future to avoid repeat Not Able to Test
   - Identify:
     - Process, design, or documentation changes needed so that the control can be tested going forward.
     - Any expectations you have for monitoring repeated Not Able to Test outcomes on this control or similar controls.

Output:

A) SLOD narrative summary (audit-ready)
   - 4–8 bullets summarizing:
     - The control's role.
     - Why it was Not Able to Test this period.
     - Your assessment of whether that is acceptable within the Procedure and risk appetite context.

B) Formal SLOD recommendation
   - 3–6 bullets clearly stating:
     - Your decision (support / support with conditions / do not support).
     - Any required actions (issues, risk acceptance, retest timing, control redesign, documentation changes).

C) Forward-looking expectations
   - 3–5 bullets on:
     - How FLOD and SLOD should prevent repeated Not Able to Test outcomes for this control.
     - Any themes or lessons that should be communicated to ERM or other governance forums.

D) Required follow-ups and escalations
   - List any:
     • Specific additional evidence/tests you would require
     • Items you would escalate to ERM, Risk Pillar Committee, or appropriate governance forums`.trim()
      }
    ]
  }
];

let workflowState = {
  currentWorkflowId: null,
  currentStepIndex: 0,
  variables: {}
};

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

async function getWorkflows() {
  const res = await chrome.storage.local.get(['workflows']);
  return Array.isArray(res.workflows) ? res.workflows : [];
}

async function setWorkflows(workflows) {
  await chrome.storage.local.set({ workflows });
  return workflows;
}

async function initializeWorkflows() {
  const existing = await getWorkflows();
  if (existing.length === 0) {
    await setWorkflows(DEFAULT_WORKFLOWS);
    return DEFAULT_WORKFLOWS;
  }
  return existing;
}

async function saveWorkflow(workflow) {
  const workflows = await getWorkflows();
  const existingIndex = workflows.findIndex(w => w.id === workflow.id);

  if (existingIndex >= 0) {
    workflows[existingIndex] = workflow;
  } else {
    workflows.push(workflow);
  }

  await setWorkflows(workflows);
  return workflow;
}

async function deleteWorkflow(workflowId) {
  const workflows = await getWorkflows();
  const filtered = workflows.filter(w => w.id !== workflowId);
  await setWorkflows(filtered);
  return filtered;
}

async function resetWorkflowsToDefaults() {
  await setWorkflows(DEFAULT_WORKFLOWS);
  return DEFAULT_WORKFLOWS;
}

async function getActiveWorkflow() {
  if (!workflowState.currentWorkflowId) return undefined;
  const workflows = await getWorkflows();
  return workflows.find(w => w.id === workflowState.currentWorkflowId);
}

function substituteVars(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || `{${key}}`);
  }
  return result;
}

async function renderWorkflowSelect() {
  const select = document.getElementById('workflow-select');
  if (!select) return;

  const workflows = await getWorkflows();
  select.innerHTML = '<option value="">-- Choose a workflow --</option>';
  for (const wf of workflows) {
    const opt = document.createElement('option');
    opt.value = wf.id;
    opt.textContent = wf.name;
    select.appendChild(opt);
  }
}

async function renderWorkflowVariables() {
  const container = document.getElementById('workflow-variables');
  if (!container) return;

  const workflow = await getActiveWorkflow();
  if (!workflow) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = workflow.variables.map(v => `
    <label for="var-${escapeHtml(v.key)}">${escapeHtml(v.label)}</label>
    <input type="text" id="var-${escapeHtml(v.key)}" class="workflow-var-input" data-key="${escapeHtml(v.key)}" value="${escapeHtml(workflowState.variables[v.key] || '')}" placeholder="Enter ${escapeHtml(v.label)}" />
  `).join('');

  container.querySelectorAll('.workflow-var-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      workflowState.variables[key] = e.target.value;
      renderWorkflowStep();
    });
  });
}

async function collectWorkflowVars() {
  const vars = {};
  const workflow = await getActiveWorkflow();
  if (!workflow) return vars;

  for (const v of workflow.variables) {
    const input = document.getElementById(`var-${v.key}`);
    if (input) {
      vars[v.key] = input.value || '';
    }
  }
  return vars;
}

async function renderWorkflowStep() {
  const workflow = await getActiveWorkflow();
  if (!workflow) return;

  const step = workflow.steps[workflowState.currentStepIndex];
  if (!step) return;

  const vars = await collectWorkflowVars();
  const preview = substituteVars(step.template, vars);

  const previewEl = document.getElementById('workflow-preview');
  const titleEl = document.getElementById('workflow-step-title');
  const currentStepEl = document.getElementById('current-step-num');
  const totalStepsEl = document.getElementById('total-steps');
  const prevBtn = document.getElementById('workflow-prev');
  const nextBtn = document.getElementById('workflow-next');

  if (previewEl) previewEl.textContent = preview;
  if (titleEl) titleEl.textContent = step.title;
  if (currentStepEl) currentStepEl.textContent = String(workflowState.currentStepIndex + 1);
  if (totalStepsEl) totalStepsEl.textContent = String(workflow.steps.length);

  if (prevBtn) prevBtn.disabled = workflowState.currentStepIndex === 0;
  if (nextBtn) nextBtn.disabled = workflowState.currentStepIndex >= workflow.steps.length - 1;
}

async function insertIntoActiveElement(text) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('m365.cloud.microsoft')) {
      alert('Please navigate to M365 Chat (https://m365.cloud.microsoft/chat) first.');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [text],
      func: (textToInsert) => {
        const inputBox =
          document.querySelector('#m365-chat-editor-target-element') ||
          document.querySelector('[contenteditable="true"]') ||
          document.querySelector('textarea');

        if (!inputBox) {
          alert('Click inside the Copilot chat input first, then try again.');
          return;
        }

        inputBox.focus();

        try {
          const okInsert = document.execCommand('insertText', false, textToInsert);
          if (okInsert) {
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            inputBox.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        } catch (e) {
          console.log('execCommand failed:', e);
        }

        if ('value' in inputBox) {
          inputBox.value = textToInsert;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          inputBox.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }

        try {
          inputBox.textContent = textToInsert;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {
          console.log('Fallback insertion failed:', e);
        }
      }
    });
  } catch (err) {
    console.error('Insert error:', err);
    alert('Could not insert into chat. Make sure you are on the M365 Chat page.');
  }
}

// -------------------------
// Populate category selects
// -------------------------
async function populateCategoryControls() {
  const list = await getCategories();
  const saveSelect = document.getElementById('prompt-category');
  if (saveSelect) {
    saveSelect.innerHTML = '';
    for (const c of list) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      saveSelect.appendChild(opt);
    }
    const optNew = document.createElement('option');
    optNew.value = NEW_CATEGORY_SENTINEL;
    optNew.textContent = '➕ Add new…';
    saveSelect.appendChild(optNew);
  }
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
    if ([...filterSelect.options].some(o => o.value === current)) {
      filterSelect.value = current;
    }
  }
}

// -------------------------
// Tabs switching
// -------------------------
function activateTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const panel = document.getElementById(`${tabName}-tab`);
  if (panel) panel.classList.add('active');
  if (tabName === 'view') {
    populateCategoryControls();
    loadPrompts(getSearchTerm(), getSelectedCategory());
  } else if (tabName === 'manage') {
    updateStats();
  } else if (tabName === 'workflows') {
    renderWorkflowSelect();
  }
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    chrome.storage.local.set({ lastActiveTab: tabName }, () => {
      activateTab(tabName);
    });
  });
});
chrome.storage.local.get(['lastActiveTab'], (result) => {
  const last = result.lastActiveTab;
  if (last) {
    activateTab(last);
  } else {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      activateTab(activeTab.dataset.tab);
    }
  }
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
    const successMsg = document.getElementById('success-message');
    if (successMsg) {
      successMsg.classList.add('show');
      setTimeout(() => successMsg.classList.remove('show'), 3000);
    }
    document.getElementById('save-form').reset();
    await populateCategoryControls();
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
    let mutated = false;
    prompts = prompts.map(p => {
      if (!p.category) { mutated = true; return { ...p, category: DEFAULT_CATEGORY }; }
      return p;
    });
    if (mutated) await chrome.storage.local.set({ prompts });
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
            ${prompt.tags?.length ? `<span class="pill">${prompt.tags.map(t => `#${escapeHtml(t)}`).join(' ')}</span>` : ''}
          </div>
        </div>
        <pre class="prompt-text">${escapeHtml(prompt.text || '')}</pre>
        <div class="prompt-actions">
          <button class="btn btn-copy" data-id="${escapeHtml(String(prompt.id))}" aria-label="Copy prompt">📋 Copy</button>
          <button class="btn btn-paste" data-id="${escapeHtml(String(prompt.id))}" aria-label="Paste prompt">📥 Paste</button>
          <button class="btn btn-delete" data-id="${escapeHtml(String(prompt.id))}" aria-label="Delete prompt">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
    listEl.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => copyPrompt(btn.getAttribute('data-id')));
    });
    listEl.querySelectorAll('.btn-paste').forEach(btn => {
      btn.addEventListener('click', () => pastePrompt(btn.getAttribute('data-id')));
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
// Paste prompt into active tab
// -------------------------
async function pastePrompt(id) {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result?.prompts || [];
    const prompt = prompts.find(p => String(p.id) === String(id));
    if (!prompt) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [prompt.text],
      func: (text) => {
        console.log('Injecting text into active tab...');
        const inputBox =
          document.querySelector('#m365-chat-editor-target-element') ||
          document.querySelector('[contenteditable="true"]') ||
          document.querySelector('textarea') ||
          document.querySelector('input[type="text"], input');

        if (!inputBox) {
          console.log('Input box not found');
          return;
        }

        inputBox.focus();

        try {
          const okInsert = document.execCommand('insertText', false, text);
          if (okInsert) {
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            inputBox.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Prompt pasted using execCommand.');
            return;
          }
        } catch (e) {
          console.log('execCommand failed:', e);
        }

        if ('value' in inputBox) {
          inputBox.value = text;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          inputBox.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Prompt pasted via .value fallback.');
          return;
        }

        try {
          inputBox.textContent = text;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Prompt pasted via textContent fallback.');
        } catch (e) {
          console.log('Fallback insertion failed:', e);
        }
      }
    });
  } catch (err) {
    console.error('Paste error:', err);
    alert('Could not paste prompt. Please try again.');
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
      const normalized = imported.map(p => ({ ...p, category: p.category?.trim() || DEFAULT_CATEGORY }));
      const result = await chrome.storage.local.get(['prompts', 'categories']);
      const existing = result?.prompts || [];
      const map = new Map();
      for (const p of existing) map.set(String(p.id), p);
      for (const p of normalized) if (!map.has(String(p.id))) map.set(String(p.id), p);
      const merged = Array.from(map.values());
      const approxBytes = new Blob([JSON.stringify(merged)]).size;
      const MAX_SAFE_BYTES = 4.5 * 1024 * 1024;
      if (approxBytes > MAX_SAFE_BYTES) {
        alert('Import too large for local storage. Consider splitting the file.');
        return;
      }
      await chrome.storage.local.set({ prompts: merged });
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
  e.target.value = '';
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
// Workflow Management
// -------------------------
let editingWorkflowId = null;
let workflowSteps = [];

async function renderWorkflowList() {
  const container = document.getElementById('workflow-list');
  if (!container) return;

  const workflows = await getWorkflows();

  if (workflows.length === 0) {
    container.innerHTML = '<div class="empty"><div class="emoji">📋</div><div>No workflows yet. Create your first workflow!</div></div>';
    return;
  }

  container.innerHTML = workflows.map(wf => `
    <div class="workflow-card">
      <div class="workflow-card-header">
        <div>
          <div class="workflow-card-title">${escapeHtml(wf.name)}</div>
          <small style="color:var(--muted);">${escapeHtml(wf.category || 'Uncategorized')} • ${wf.steps.length} step${wf.steps.length !== 1 ? 's' : ''} • ${wf.variables.length} variable${wf.variables.length !== 1 ? 's' : ''}</small>
        </div>
        <div class="workflow-card-actions">
          <button class="btn" data-edit-workflow="${escapeHtml(wf.id)}" title="Edit">✏️</button>
          <button class="btn danger" data-delete-workflow="${escapeHtml(wf.id)}" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-edit-workflow]').forEach(btn => {
    btn.addEventListener('click', () => editWorkflow(btn.getAttribute('data-edit-workflow')));
  });

  container.querySelectorAll('[data-delete-workflow]').forEach(btn => {
    btn.addEventListener('click', () => deleteWorkflowById(btn.getAttribute('data-delete-workflow')));
  });
}

async function editWorkflow(workflowId) {
  const workflows = await getWorkflows();
  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) return;

  editingWorkflowId = workflowId;
  workflowSteps = [...workflow.steps];

  document.getElementById('workflow-form-title').textContent = 'Edit Workflow';
  document.getElementById('wf-name').value = workflow.name;
  document.getElementById('wf-category').value = workflow.category || '';
  document.getElementById('wf-variables').value = workflow.variables.map(v => `${v.key}|${v.label}`).join('\n');

  renderWorkflowStepsEditor();
  document.getElementById('workflow-form').style.display = 'block';
}

async function deleteWorkflowById(workflowId) {
  const workflows = await getWorkflows();
  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) return;

  if (!confirm(`Are you sure you want to delete "${workflow.name}"? This cannot be undone!`)) return;

  await deleteWorkflow(workflowId);
  await renderWorkflowList();
  await renderWorkflowSelect();
  await updateWorkflowStats();
}

function renderWorkflowStepsEditor() {
  const container = document.getElementById('workflow-steps-container');
  if (!container) return;

  container.innerHTML = workflowSteps.map((step, index) => `
    <div class="step-editor">
      <div class="step-editor-header">
        <strong>Step ${index + 1}</strong>
        <button class="btn danger" data-remove-step="${index}" style="padding:4px 8px;font-size:12px;">Remove</button>
      </div>
      <input type="text" placeholder="Step title (e.g., Step 1: Initial Review)" value="${escapeHtml(step.title)}" data-step-title="${index}" />
      <textarea placeholder="Step template with {variable} placeholders..." data-step-template="${index}">${escapeHtml(step.template)}</textarea>
    </div>
  `).join('');

  container.querySelectorAll('[data-step-title]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.getAttribute('data-step-title'));
      workflowSteps[index].title = e.target.value;
    });
  });

  container.querySelectorAll('[data-step-template]').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const index = parseInt(e.target.getAttribute('data-step-template'));
      workflowSteps[index].template = e.target.value;
    });
  });

  container.querySelectorAll('[data-remove-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-remove-step'));
      workflowSteps.splice(index, 1);
      renderWorkflowStepsEditor();
    });
  });
}

async function updateWorkflowStats() {
  const workflows = await getWorkflows();
  const countEl = document.getElementById('workflow-count');
  if (countEl) countEl.textContent = String(workflows.length);
}

document.getElementById('manage-workflows-btn')?.addEventListener('click', async () => {
  const manager = document.getElementById('workflow-manager');
  if (manager) {
    manager.style.display = 'block';
    await renderWorkflowList();
    await updateWorkflowStats();
  }
});

document.getElementById('close-workflow-manager')?.addEventListener('click', () => {
  const manager = document.getElementById('workflow-manager');
  if (manager) manager.style.display = 'none';
  document.getElementById('workflow-form').style.display = 'none';
});

document.getElementById('create-workflow-btn')?.addEventListener('click', () => {
  editingWorkflowId = null;
  workflowSteps = [];

  document.getElementById('workflow-form-title').textContent = 'Create New Workflow';
  document.getElementById('wf-name').value = '';
  document.getElementById('wf-category').value = '';
  document.getElementById('wf-variables').value = '';

  renderWorkflowStepsEditor();
  document.getElementById('workflow-form').style.display = 'block';
});

document.getElementById('add-step-btn')?.addEventListener('click', () => {
  workflowSteps.push({ title: '', template: '' });
  renderWorkflowStepsEditor();
});

document.getElementById('cancel-workflow-btn')?.addEventListener('click', () => {
  document.getElementById('workflow-form').style.display = 'none';
  editingWorkflowId = null;
  workflowSteps = [];
});

document.getElementById('save-workflow-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('wf-name').value.trim();
  const category = document.getElementById('wf-category').value.trim() || 'Uncategorized';
  const variablesText = document.getElementById('wf-variables').value.trim();

  if (!name) {
    alert('Please enter a workflow name.');
    return;
  }

  if (workflowSteps.length === 0) {
    alert('Please add at least one step.');
    return;
  }

  const variables = variablesText.split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('|'))
    .map(line => {
      const [key, label] = line.split('|').map(s => s.trim());
      return { key, label };
    });

  const workflow = {
    id: editingWorkflowId || crypto.randomUUID(),
    name,
    category,
    variables,
    steps: workflowSteps.filter(s => s.title && s.template)
  };

  await saveWorkflow(workflow);
  await renderWorkflowList();
  await renderWorkflowSelect();
  await updateWorkflowStats();

  document.getElementById('workflow-form').style.display = 'none';
  editingWorkflowId = null;
  workflowSteps = [];

  alert(`Workflow "${name}" saved successfully!`);
});

// -------------------------
// Workflow Export/Import
// -------------------------
document.getElementById('export-workflows-btn')?.addEventListener('click', async () => {
  const workflows = await getWorkflows();
  if (workflows.length === 0) {
    alert('No workflows to export.');
    return;
  }
  const json = JSON.stringify(workflows, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workflows-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-workflows-btn')?.addEventListener('click', () => {
  document.getElementById('import-workflows-file')?.click();
});

document.getElementById('import-workflows-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) {
        alert('Invalid file format. Expected an array of workflow objects.');
        return;
      }

      const existing = await getWorkflows();
      const map = new Map();
      for (const w of existing) map.set(w.id, w);
      for (const w of imported) {
        if (w.id && w.name && Array.isArray(w.steps) && Array.isArray(w.variables)) {
          map.set(w.id, w);
        }
      }

      const merged = Array.from(map.values());
      await setWorkflows(merged);
      await renderWorkflowList();
      await renderWorkflowSelect();
      await updateWorkflowStats();

      alert(`Successfully imported ${imported.length} workflow(s)!`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing file: ' + (err?.message || String(err)));
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('reset-workflows-btn')?.addEventListener('click', async () => {
  if (!confirm('Reset all workflows to defaults? This will delete any custom workflows you created!')) return;

  await resetWorkflowsToDefaults();
  await renderWorkflowList();
  await renderWorkflowSelect();
  await updateWorkflowStats();

  alert('Workflows reset to defaults!');
});

// -------------------------
// Workflow Event Handlers
// -------------------------
document.getElementById('workflow-select')?.addEventListener('change', async (e) => {
  const workflowId = e.target.value;
  const contentDiv = document.getElementById('workflow-content');

  if (!workflowId) {
    if (contentDiv) contentDiv.style.display = 'none';
    workflowState.currentWorkflowId = null;
    workflowState.currentStepIndex = 0;
    workflowState.variables = {};
    return;
  }

  workflowState.currentWorkflowId = workflowId;
  workflowState.currentStepIndex = 0;
  workflowState.variables = {};

  if (contentDiv) contentDiv.style.display = 'block';
  await renderWorkflowVariables();
  await renderWorkflowStep();
});

document.getElementById('workflow-prev')?.addEventListener('click', async () => {
  if (workflowState.currentStepIndex > 0) {
    workflowState.currentStepIndex--;
    await renderWorkflowStep();
  }
});

document.getElementById('workflow-next')?.addEventListener('click', async () => {
  const workflow = await getActiveWorkflow();
  if (workflow && workflowState.currentStepIndex < workflow.steps.length - 1) {
    workflowState.currentStepIndex++;
    await renderWorkflowStep();
  }
});

document.getElementById('workflow-insert')?.addEventListener('click', async () => {
  const workflow = await getActiveWorkflow();
  if (!workflow) return;

  const step = workflow.steps[workflowState.currentStepIndex];
  if (!step) return;

  const vars = await collectWorkflowVars();
  const text = substituteVars(step.template, vars);

  await insertIntoActiveElement(text);
});

document.getElementById('workflow-copy')?.addEventListener('click', async () => {
  const workflow = await getActiveWorkflow();
  if (!workflow) return;

  const step = workflow.steps[workflowState.currentStepIndex];
  if (!step) return;

  const vars = await collectWorkflowVars();
  const text = substituteVars(step.template, vars);

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('workflow-copy');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = '#45a049';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 1600);
  } catch (err) {
    console.error('Clipboard error:', err);
    alert('Could not copy to clipboard. Please try again.');
  }
});

// -------------------------
// Detach to new window
// -------------------------
document.getElementById('detach-btn')?.addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 450,
    height: 650
  });
});

// -------------------------
// Initialize on load
// -------------------------
(async function init() {
  await initializeWorkflows();
  await populateCategoryControls();
  await renderWorkflowSelect();
  await updateWorkflowStats();
})();

