
# Prompt Manager (Chrome Extension Popup)

**Last updated:** 2025-10-07 17:46:09

This repository contains the popup logic for a simple **Prompt Manager** in a Chrome/Chromium extension. 
It lets you **save**, **search**, **copy**, **delete**, **export**, and **import** text prompts using `chrome.storage.local`.

---

## Table of Contents
- [Features](#features)
- [Architecture & Data Model](#architecture--data-model)
- [Security & Privacy](#security--privacy)
- [Operating Guide](#operating-guide)
- [Code Review Summary](#code-review-summary)
- [Test Checklist](#test-checklist)
- [Known Limitations](#known-limitations)
- [File Inventory](#file-inventory)

---

## Features
- **Save** prompts with a title, tags (comma-separated), and text
- **View & Search** prompts (matches title, text, tags)
- **Copy** prompt text to clipboard (with visual feedback)
- **Delete** single prompt / **Clear All**
- **Export** all prompts to a timestamped JSON backup
- **Import** prompts from JSON (merges by unique `id`)
- **Prompt count** visible in the *Manage* tab

---

## Architecture & Data Model
- Uses **Manifest V3**-compatible popup script (`popup.js`)
- Persists data with `chrome.storage.local` under the key `prompts`
- **Prompt object schema**:

```json
{
  "id": "string | number",     // hardened build uses crypto.randomUUID()
  "title": "string",
  "tags": ["string", "string"],
  "text": "string",
  "createdAt": "ISOString"
}
```

---

## Security & Privacy
- **Output escaping**: All user-supplied strings (title, tags, text) are escaped before injecting into the DOM to mitigate XSS.
- **Safer IDs**: Uses `crypto.randomUUID()` to avoid collisions.
- **Import validation**: Basic schema validation on imported JSON.
- **Error handling**: `try/catch` around clipboard and storage operations with user-friendly fallback messages.
- **Storage considerations**: `chrome.storage.local` is not a secrets vault. Treat prompts as non-sensitive unless you implement encryption.
  - Optional next steps (not required for operation): add a passphrase and encrypt prompt payloads with WebCrypto (AES-GCM), add an inactivity lock, and implement size checks for storage quotas.

---

## Operating Guide

### Prerequisites
- Chrome or a Chromium-based browser with extension support
- The extension loaded (Developer mode → **Load unpacked** → select folder)

### UI Overview
- **Tabs**
  - **Save**: Enter *Title*, *Tags* (comma-separated, optional), and *Text*, then click **Save**
  - **View**: Browse and search prompts; **Copy** or **Delete** each item
  - **Manage**: See **Prompt Count**, **Export**, **Import**, and **Clear All**

### Key Actions
1. **Save a prompt**
   - Fill *Title* and *Text* (Tags optional) → **Save** → success message appears.
2. **Search**
   - Type in the search box on the **View** tab; matches title, text, or any tag (case-insensitive).
3. **Copy to clipboard**
   - Click **📋 Copy**; the button briefly changes to **✓ Copied!**
4. **Delete one**
   - Click **🗑️ Delete** and confirm.
5. **Export**
   - Click **Export** to download `prompts-backup-<timestamp>.json`.
6. **Import**
   - Click **Import** and select a JSON file that contains an array of prompts. Import **merges** by `id`.
7. **Clear All**
   - Click **Clear All** and confirm to remove all prompts.

### Sample JSON for Import
```json
[
  {
    "id": "a5c9d3f0-52a1-4c3e-8fd0-1b0b6b8b4ab2",
    "title": "Daily stand-up",
    "tags": ["agile", "team"],
    "text": "What did you do yesterday? What will you do today? Any blockers?",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
]
```

---

## Code Review Summary
**Strengths**
- Clear UX and local persistence.
- Defensive output encoding for user text.
- Simple, predictable import/merge logic.

**Hardenings in this build**
- Escape **tags** as well as title/text.
- Use **strict comparisons** by normalizing types.
- **Import schema validation** added.
- **Clipboard and storage** calls wrapped in `try/catch`.
- IDs use **`crypto.randomUUID()`** by default.

**Further Enhancements (optional)**
- Replace `alert()`/`confirm()` with non-blocking toasts/modals.
- Add passphrase-based encryption (WebCrypto AES-GCM) for sensitive content.
- Implement storage quota checks (approximate byte-size before writes).

---

## Test Checklist
- Save with and without tags; verify success toast resets form
- Search matches title, text, tags (case-insensitive)
- Copy updates button text then reverts; clipboard contains prompt text
- Delete removes the right item; list refreshes correctly
- Export downloads valid JSON; Import merges without duplicates
- Clear All empties list and count
- XSS safety: strings like `<img onerror=alert(1)>` display as text, not HTML

---

## Known Limitations
- `chrome.storage.local` is plaintext on disk; do not store confidential secrets without additional encryption.
- Very large prompt sets may approach storage limits; consider paging or archiving.

---

## File Inventory
- `popup.js` — the hardened popup script
- `README.md` — this documentation (overview + operating guide + code review)
- `OPERATING_GUIDE.docx` — end-user operating guide (Word)

