
# Prompt Manager & Workflow Assistant (Chrome Extension)

**Last updated:** 2025-07-14

This repository contains a Chrome/Chromium extension that combines a **Prompt Manager** with **Workflow Automation** capabilities.
It lets you **save**, **search**, **copy**, **delete**, **export**, and **import** text prompts, plus run **guided multi-step workflows** with variable substitution and direct integration with **Microsoft 365 Copilot Chat**.

---

## Table of Contents
- [Features](#features)
- [Architecture & Data Model](#architecture--data-model)
- [Workflows](#workflows)
- [Security & Privacy](#security--privacy)
- [Operating Guide](#operating-guide)
- [Code Review Summary](#code-review-summary)
- [Test Checklist](#test-checklist)
- [Known Limitations](#known-limitations)
- [File Inventory](#file-inventory)

---

## Features

### Prompt Management
- **Save** prompts with title, category, tags (comma-separated), and text
- **Categorize** prompts (e.g., SDLC, Control Testing, IAM, BCP/DR)
- **View & Search** prompts (matches title, text, tags)
- **Filter** by category
- **Copy** prompt text to clipboard (with visual feedback)
- **Paste** prompts directly into active web pages
- **Delete** single prompt / **Clear All**
- **Export** all prompts to a timestamped JSON backup
- **Import** prompts from JSON (merges by unique `id`)
- **Prompt count** visible in the *Manage* tab

### Workflow Automation (NEW)
- **Guided multi-step workflows** for common tasks
- **Variable substitution** with real-time preview
- **Step navigation** (Prev/Next) through workflow stages
- **Direct insertion** into Microsoft 365 Copilot Chat
- **Copy to clipboard** fallback option
- **Pre-built workflows**:
  - IT Control Test QA (3-step process)
  - Issue & RP – SLOD Credible Challenge (3-step process)
  - SLOD Review – Not Able to Test (3-step process)

### UI Appearance
- **Green color theme** — easy-on-the-eyes pale green background (`#e8f5e9`) with dark green text (`#1b5e20`) and soft green accents (`#81c784`)
- **Scrollable text areas** — all prompt input fields, step editors, and preview panels include vertical scrolling (`overflow-y: auto`) for long content without expanding the popup
- **Resizable text areas** — prompt and step text fields can be resized vertically by dragging the bottom edge
- All UI elements use a cohesive Material Design green palette for a calm, readable, and accessible interface

---

## Architecture & Data Model

### Technology Stack
- **Manifest V3**-compatible Chrome extension
- Persists data with `chrome.storage.local`
- Content script injection for M365 Chat integration

### Data Models

**Prompt object schema**:
```json
{
  "id": "string",              // crypto.randomUUID()
  "title": "string",
  "category": "string",        // e.g., "Control Testing"
  "tags": ["string", "string"],
  "text": "string",
  "createdAt": "ISOString"
}
```

**Workflow object schema**:
```json
{
  "id": "string",
  "name": "string",
  "category": "string",
  "variables": [
    {
      "key": "string",         // e.g., "control_name"
      "label": "string"        // e.g., "Control Name"
    }
  ],
  "steps": [
    {
      "title": "string",
      "template": "string"     // uses {key} placeholders
    }
  ]
}
```

---

## Workflows

### 1. IT Control Test QA (3-step)
**Category:** Control Testing

A guided workflow for IT control testing with three stages.

**Variables:**
- Control Name
- Control ID
- Test Period

**Steps:**
1. **Test Evidence Request** - Request documentation and evidence
2. **Evidence Review & Analysis** - Analyze completeness and effectiveness
3. **Test Conclusion & Reporting** - Document findings and recommendations

### 2. Issue & RP – SLOD Credible Challenge (3-step)
**Category:** Risk & Compliance

A structured workflow for Second Line of Defense (SLOD) credible challenge reviews of issues and remediation plans.

**Variables:**
- Source (e.g., Internal Audit, Regulatory Exam, SLOD Review)
- Issue Rating (e.g., High, Moderate, Low)

**Steps:**
1. **Initial Review & Context Gathering** - Understand issue background and remediation plan
2. **Deep Dive Analysis & Testing** - Evaluate root cause, controls, and remediation effectiveness
3. **SLOD Conclusion & Recommendation** - Provide independent assessment and recommendations

### 3. SLOD Review – Not Able to Test (3-step)
**Category:** Control Testing

A comprehensive workflow for documenting SLOD reviews when controls cannot be tested due to various constraints.

**Variables:**
- Control Name
- Control Description
- Reason Not Testable (e.g., system unavailable, insufficient evidence, timing constraints)
- Period (e.g., Q1 2025)
- Testing Guidance (e.g., alternative procedures, future testing approach)

**Steps:**
1. **Initial Review & Procedure Alignment** - Verify control design and testing constraints
2. **Deep Dive – Validity & Risk Assessment** - Assess impact and alternative evidence
3. **SLOD Recommendation & Audit-Ready Summary** - Document conclusion and next steps

### How to Use Workflows
1. Navigate to the **Workflows** tab
2. Select a workflow from the dropdown
3. Fill in the variable fields (all workflows have 2-5 variables)
4. Navigate through steps using **Prev/Next** buttons
5. Click **Insert into Chat** to send to M365 Copilot, or **Copy** to clipboard

### Adding Custom Workflows
Workflows are defined in `popup.js` in the `DEFAULT_WORKFLOWS` array. To add a new workflow:
1. Define variables with `key` and `label`
2. Create step templates using `{variable_key}` placeholders
3. Add the workflow object to the array

---

## Security & Privacy

### Security Measures
- **Output escaping**: All user-supplied strings (title, tags, text) are escaped before injecting into the DOM to mitigate XSS
- **Safer IDs**: Uses `crypto.randomUUID()` to avoid collisions
- **Import validation**: Basic schema validation on imported JSON
- **Error handling**: `try/catch` around clipboard and storage operations with user-friendly fallback messages
- **Content script isolation**: M365 Chat integration uses secure script injection

### Privacy Considerations
- **Local storage only**: All data stored in `chrome.storage.local` (not synced to cloud)
- **No external requests**: Extension operates entirely offline
- **Host permissions**: Only requests access to `m365.cloud.microsoft/*` for chat integration
- **Storage considerations**: `chrome.storage.local` is not encrypted. Treat prompts as non-sensitive unless you implement encryption

### Optional Enhancements
- Add passphrase-based encryption with WebCrypto (AES-GCM)
- Implement inactivity lock
- Add storage quota checks

---

## Operating Guide

### Prerequisites
- Chrome or Chromium-based browser with extension support
- The extension loaded (Developer mode → **Load unpacked** → select folder)
- For workflow insertion: Access to Microsoft 365 Copilot Chat

### Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the extension folder
5. The extension icon should appear in your toolbar

### UI Overview

**Tabs:**
- **Save Prompt**: Create and save new prompts with categories and tags
- **My Prompts**: Browse, search, filter, copy, paste, and delete prompts
- **Workflows**: Run guided multi-step workflows with variable substitution
- **Manage**: View statistics, export/import data, clear all prompts

**UI Theme & Layout:**
- The extension uses a **green color theme** with a pale green background (`#e8f5e9`), dark green text (`#1b5e20`), and soft green accents (`#81c784`) for a calm, easy-on-the-eyes appearance
- All **prompt text fields** and **preview panels** have vertical scrollbars (using `overflow-y: auto`) so you can view and edit long content without the popup expanding
- Text areas are **resizable** — drag the bottom edge to adjust height as needed

### Key Actions

#### Prompt Management

1. **Save a prompt**
   - Fill *Title*, select/create *Category*, add *Tags* (optional), enter *Text*
   - Click **Save Prompt** → success message appears
   - Form resets automatically

2. **Search & Filter**
   - Type in the search box on the **My Prompts** tab
   - Matches title, text, or any tag (case-insensitive)
   - Use category dropdown to filter by category

3. **Copy to clipboard**
   - Click **📋 Copy** → button briefly changes to **✓ Copied!**

4. **Paste into active page**
   - Click **📥 Paste** → prompt inserted into focused input field
   - Works with M365 Chat, contenteditable fields, textareas, and input boxes

5. **Delete one**
   - Click **🗑️ Delete** and confirm

6. **Export**
   - Click **📤 Export** to download `prompts-backup-<timestamp>.json`

7. **Import**
   - Click **📥 Import** and select a JSON file
   - Import **merges** by `id` (no duplicates)

8. **Clear All**
   - Click **🗑️ Clear All Prompts** and confirm to remove all prompts

#### Workflow Usage

1. **Select a workflow**
   - Navigate to **Workflows** tab
   - Choose workflow from dropdown (e.g., "IT Control Test QA (3-step)")

2. **Fill in variables**
   - Enter values for each variable field
   - Preview updates in real-time with your values

3. **Navigate steps**
   - Use **← Prev** and **Next →** buttons to move between steps
   - Current step indicator shows "Step X of Y"

4. **Insert into M365 Chat**
   - Navigate to `https://m365.cloud.microsoft/chat`
   - Click inside the Copilot chat input
   - Return to extension and click **📤 Insert into Chat**
   - Prompt appears in chat input (not sent automatically)

5. **Copy to clipboard**
   - Click **📋 Copy** as a fallback option
   - Paste manually into any application

### Sample JSON for Import
```json
[
  {
    "id": "a5c9d3f0-52a1-4c3e-8fd0-1b0b6b8b4ab2",
    "title": "Daily stand-up",
    "category": "Agile",
    "tags": ["agile", "team"],
    "text": "What did you do yesterday? What will you do today? Any blockers?",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
]
```

---

## Code Review Summary

### Strengths
- Clear UX with tabbed interface and local persistence
- Defensive output encoding for all user text
- Simple, predictable import/merge logic
- Modular workflow system for easy extensibility
- Real-time variable substitution with preview

### Hardenings in Current Build
- Escape **tags** and **categories** as well as title/text
- Use **strict comparisons** by normalizing types
- **Import schema validation** added
- **Clipboard and storage** calls wrapped in `try/catch`
- IDs use **`crypto.randomUUID()`** by default
- **Category management** with persistent storage
- **Workflow state management** for multi-step processes

### Further Enhancements (Optional)
- Replace `alert()`/`confirm()` with non-blocking toasts/modals
- Add passphrase-based encryption (WebCrypto AES-GCM) for sensitive content
- Implement storage quota checks (approximate byte-size before writes)
- Add workflow persistence to allow user-created workflows
- Implement workflow templates for other use cases (SOX, IAM, Change Management)
- Add workflow export/import functionality

---

## Test Checklist

### Prompt Saver (Regression)
- [ ] Save with and without tags; verify success toast resets form
- [ ] Category selection and "Add new" category works
- [ ] Search matches title, text, tags (case-insensitive)
- [ ] Category filter correctly filters prompts
- [ ] Copy updates button text then reverts; clipboard contains prompt text
- [ ] Paste inserts prompt into active element
- [ ] Delete removes the right item; list refreshes correctly
- [ ] Export downloads valid JSON; Import merges without duplicates
- [ ] Clear All empties list and count
- [ ] XSS safety: strings like `<script>alert(1)</script>` display as text, not HTML

### Workflows – All Three Workflows
- [ ] Workflow tab loads with all three workflows in dropdown
- [ ] "IT Control Test QA (3-step)" workflow selectable
- [ ] "Issue & RP – SLOD Credible Challenge" workflow selectable
- [ ] "SLOD Review – Not Able to Test" workflow selectable
- [ ] Variables render with correct labels for each workflow
- [ ] Typing in variables updates the preview for the current step
- [ ] Prev/Next cycle correctly through 3 steps for each workflow
- [ ] Prev button disabled on step 1, Next button disabled on step 3
- [ ] Step indicator shows "Step X of 3" correctly
- [ ] Variable substitution works correctly with {placeholder} format

### Insert into M365 Chat
- [ ] Navigate to `https://m365.cloud.microsoft/chat`
- [ ] Focus the Copilot chat input
- [ ] In the popup, choose a step → click **Insert into Chat**
- [ ] The prompt appears in the Copilot chat input without sending
- [ ] If no element is focused, you see the "Click inside the Copilot chat input first" alert
- [ ] If not on M365 Chat page, appropriate error message appears

### Clipboard Fallback
- [ ] **📋 Copy** places the exact preview text in the clipboard
- [ ] Button shows "✓ Copied!" feedback

### Performance / UI
- [ ] Popup opens quickly
- [ ] No console errors in the extension background or popup pages
- [ ] Tab switching works smoothly
- [ ] Real-time preview updates without lag
- [ ] UI displays with green color theme (pale green background `#e8f5e9`, dark green text `#1b5e20`, soft green borders `#81c784`)
- [ ] All prompt text fields display vertical scrollbar when content overflows
- [ ] Workflow preview panel displays vertical scrollbar when content overflows
- [ ] Step editor textarea is scrollable for long prompts

---

## Known Limitations

### Storage
- `chrome.storage.local` is plaintext on disk; do not store confidential secrets without additional encryption
- Very large prompt sets may approach storage limits (~5MB); consider paging or archiving

### M365 Chat Integration
- Requires user to be on `https://m365.cloud.microsoft/chat` domain
- User must manually click inside chat input before insertion
- Prompt is inserted but not automatically sent (by design)

### Workflows
- Workflows are currently hard-coded in `popup.js`
- No UI for creating/editing workflows (future enhancement)
- Limited to text-based templates (no conditional logic)

---

## File Inventory

### Core Files
- `manifest.json` — Extension manifest (Manifest V3)
- `popup.html` — Extension popup UI
- `popup.js` — Main logic for prompts and workflows
- `icon16.png`, `icon48.png`, `icon128.png` — Extension icons

### Documentation
- `README.md` — This comprehensive documentation
- `OPERATING_GUIDE.docx` — End-user operating guide (Word format)
- `Abacus-conversation.docx` — Requirements and design document

---

## Contributing

To add new workflows:
1. Edit `popup.js`
2. Add a new workflow object to the `DEFAULT_WORKFLOWS` array
3. Define variables and step templates
4. Test thoroughly using the checklist above

## License

[Specify your license here]

## Support

For issues or questions, please [create an issue](link-to-issues) or contact [your-contact-info].

