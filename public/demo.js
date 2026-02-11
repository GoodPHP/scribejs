// Scribe Editor Demo - Vanilla JS Implementation
// Matches functionality from React project

import { Scribe } from '../dist/index.js';

// =============================================
// Sample Content
// =============================================

const sampleContent = `
<h1>Welcome to Scribe</h1>
<p>Scribe is a <strong>production-ready</strong> rich text editor with a simple, intuitive API. Just call methods like <code>editor.bold()</code> — no complex commands to memorize.</p>

<h2>Key Features</h2>
<ul>
  <li><strong>Simple API</strong> — Direct methods like .bold(), .italic(), .link()</li>
  <li><strong>Inline-first editing</strong> — Edit content directly where it lives</li>
  <li><strong>Plugin architecture</strong> — Extend with modular plugins</li>
  <li><strong>XSS protection</strong> — Built-in HTML sanitization</li>
</ul>

<h2>Try It Out</h2>
<p>Select any text to see the floating toolbar in action. Try making text <strong>bold</strong>, <em>italic</em>, or add a <a href="https://example.com">link</a>.</p>

<blockquote>
  "The best interface is no interface at all." — Golden Krishna
</blockquote>

<p>Ready to build something amazing? Check out the <strong>docs</strong>! 🚀</p>
`;

const fixedSampleContent = `<p>This editor uses a fixed toolbar that's always visible. Great for longer editing sessions where you need quick access to all formatting options.</p><p>Try creating some <strong>formatted content</strong> using the toolbar above!</p>`;

// =============================================
// Tab Switching
// =============================================

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        document.querySelector(`[data-panel="${targetTab}"]`).classList.add('active');
    });
});

// =============================================
// Editor Initialization
// =============================================

const floatingEditorEl = document.getElementById('editor-floating');
const fixedEditorEl = document.getElementById('editor-fixed');

floatingEditorEl.innerHTML = sampleContent;
fixedEditorEl.innerHTML = fixedSampleContent;

const floatingEditor = Scribe.init('#editor-floating');
const fixedEditor = Scribe.init('#editor-fixed');

// =============================================
// Floating Toolbar Logic
// =============================================

const floatingToolbar = document.getElementById('toolbar-floating');
let savedSelection = null;

function updateFloatingToolbarPosition(selection) {
    if (!selection || !selection.rect || selection.collapsed) {
        floatingToolbar.classList.remove('visible');
        return;
    }

    const rect = selection.rect;
    const toolbarHeight = 44;
    const padding = 8;

    let x = rect.left + rect.width / 2;
    let y = rect.top - toolbarHeight - padding;

    // If no space above, show below
    if (y < padding) {
        y = rect.bottom + padding;
    }

    // Keep within viewport horizontally
    const toolbarWidth = floatingToolbar.offsetWidth || 400;
    const maxX = window.innerWidth - toolbarWidth / 2 - padding;
    const minX = toolbarWidth / 2 + padding;
    x = Math.max(minX, Math.min(maxX, x));

    floatingToolbar.style.left = `${x}px`;
    floatingToolbar.style.top = `${y}px`;
    floatingToolbar.classList.add('visible');
}

floatingEditor.on('selectionChange', (selection) => {
    if (!selection || selection.collapsed || !selection.text.trim()) {
        // Don't hide immediately if link modal is open
        if (linkModal && !linkModal.classList.contains('visible')) {
            floatingToolbar.classList.remove('visible');
        }
        return;
    }
    updateFloatingToolbarPosition(selection);
    updateToolbarState(floatingEditor, floatingToolbar);
});

floatingEditor.on('blur', () => {
    setTimeout(() => {
        if (linkModal && !linkModal.classList.contains('visible')) {
            floatingToolbar.classList.remove('visible');
        }
    }, 200);
});

// Hide floating toolbar when clicking outside
document.addEventListener('mousedown', (e) => {
    if (!floatingToolbar.contains(e.target) && !floatingEditorEl.contains(e.target)) {
        if (linkModal && !linkModal.classList.contains('visible')) {
            floatingToolbar.classList.remove('visible');
        }
    }
});

// Prevent toolbar mousedown from stealing selection
floatingToolbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
});

// =============================================
// Fixed Toolbar Logic
// =============================================

const fixedToolbar = document.getElementById('toolbar-fixed');

fixedEditor.on('selectionChange', () => {
    updateToolbarState(fixedEditor, fixedToolbar);
});

fixedEditor.on('formatChange', () => {
    updateToolbarState(fixedEditor, fixedToolbar);
});

fixedEditor.on('change', () => {
    requestAnimationFrame(() => {
        updateToolbarState(fixedEditor, fixedToolbar);
    });
});

fixedToolbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
});

// =============================================
// Toolbar Button State Management
// =============================================

function updateToolbarState(editor, toolbar) {
    const formatState = editor.getFormatState();
    const selection = editor.getSelection();
    const hasSelection = selection && !selection.collapsed;

    // Update button active/disabled states
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
        const cmd = btn.dataset.cmd;
        const arg = btn.dataset.arg ? parseInt(btn.dataset.arg) : undefined;

        // Get command state from registry if available
        const commandState = editor.getCommandState(cmd);
        let isActive = false;
        let isEnabled = true;

        if (commandState) {
            isActive = commandState.active;
            isEnabled = commandState.enabled;
        } else {
            // Fallback for non-registered commands
            switch (cmd) {
                case 'bold': isActive = formatState.bold; break;
                case 'italic': isActive = formatState.italic; break;
                case 'underline': isActive = formatState.underline; break;
                case 'strike': isActive = formatState.strike; break;
                case 'code': isActive = formatState.code; break;
                case 'link': isActive = !!formatState.link; break;
                case 'heading': isActive = formatState.heading !== null; break;
                case 'orderedList': isActive = formatState.list === 'ordered'; break;
                case 'unorderedList': isActive = formatState.list === 'unordered'; break;
                case 'blockquote': isActive = formatState.blockquote; break;
            }
            if (cmd === 'unlink') isEnabled = !!formatState.link;
        }

        // Apply refinement fixes for demo toolbar buttons (arg-aware highlights)
        if (cmd === 'heading' && arg !== undefined) {
            // Ensure H1 button only lights up for heading:1, etc.
            isActive = formatState.heading === arg;
        }

        btn.classList.toggle('active', isActive);
        btn.disabled = !isEnabled;

    });
}

// =============================================
// Toolbar Button Handlers
// =============================================

function handleToolbarCommand(editor, cmd, arg, buttonElement) {
    if (cmd === 'link') {
        showLinkModal(editor, buttonElement);
        return;
    }

    // Save and restore selection (cross-browser protection)
    editor.saveSelection('toolbar');
    editor.restoreSelection();

    const formatState = editor.getFormatState();
    const mutualStyles = ['bold', 'italic', 'underline', 'strike'];

    // Mutual exclusivity logic based on React project requirements
    if (cmd === 'code') {
        // Applying code: remove bold, italic, underline, strike if present
        if (!formatState.code) {
            mutualStyles.forEach(style => {
                if (formatState[style]) {
                    editor.exec(style);
                }
            });
        }
    } else if (mutualStyles.includes(cmd)) {
        // Applying bold/italic/etc: remove code if present
        if (formatState.code) {
            editor.exec('code');
        }
    }

    // Execute command
    if (arg !== undefined) {
        editor.exec(cmd, arg);
    } else {
        editor.exec(cmd);
    }
}

// Attach handlers to all toolbar buttons
document.querySelectorAll('.toolbar button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const cmd = btn.dataset.cmd;
        const arg = btn.dataset.arg ? parseInt(btn.dataset.arg) : undefined;

        // Determine which editor based on toolbar
        const toolbar = btn.closest('.toolbar');
        const editor = toolbar.id === 'toolbar-floating' ? floatingEditor : fixedEditor;

        handleToolbarCommand(editor, cmd, arg, btn);
    });
});

// =============================================
// Link Modal
// =============================================

const linkModal = document.querySelector('.link-modal');
const linkModalBackdrop = document.querySelector('.link-modal-backdrop');
const linkModalInput = document.getElementById('link-url-input');
const linkModalForm = document.getElementById('link-form');
const linkRemoveBtn = document.getElementById('link-remove');
const linkCancelBtn = document.getElementById('link-cancel');

let currentEditor = null;

function showLinkModal(editor, buttonElement) {
    currentEditor = editor;

    // Save selection
    editor.saveSelection('toolbar');

    // Get current link URL if editing
    const formatState = editor.getFormatState();
    const currentUrl = formatState.link || '';
    linkModalInput.value = currentUrl;

    // Show/hide remove button
    linkRemoveBtn.style.display = currentUrl ? 'flex' : 'none';

    // Position modal below button
    if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - 150;
        const y = rect.bottom + 8;

        linkModal.style.left = `${x}px`;
        linkModal.style.top = `${y}px`;
    }

    // Show modal
    linkModalBackdrop.classList.add('visible');
    linkModal.classList.add('visible');

    // Focus input
    setTimeout(() => linkModalInput.focus(), 50);
}

function hideLinkModal() {
    linkModalBackdrop.classList.remove('visible');
    linkModal.classList.remove('visible');

    if (currentEditor) {
        currentEditor.restoreSelection();
        currentEditor.focus();
    }
}

linkModalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentEditor) return;

    let url = linkModalInput.value.trim();

    if (url) {
        // Add protocol if missing
        if (!url.match(/^https?:\/\//) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
            url = 'https://' + url;
        }

        currentEditor.restoreSelection();
        currentEditor.link(url);
    }

    hideLinkModal();
});

linkRemoveBtn.addEventListener('click', () => {
    if (currentEditor) {
        currentEditor.restoreSelection();
        currentEditor.unlink();
    }
    hideLinkModal();
});

linkCancelBtn.addEventListener('click', () => {
    hideLinkModal();
});

linkModalBackdrop.addEventListener('click', () => {
    hideLinkModal();
});

// Handle escape key
linkModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        hideLinkModal();
    }
});

// =============================================
// Quick Start Tabs & Copy
// =============================================

const windowTabs = document.querySelectorAll('.window-tab');
const windowPanels = document.querySelectorAll('.code-panel');

windowTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.target;

        // Update tabs
        windowTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update panels
        windowPanels.forEach(p => p.classList.remove('active'));
        document.getElementById(`code-${target}`).classList.add('active');
    });
});

document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const panel = document.getElementById(targetId);
        const code = panel.querySelector('code').textContent;

        navigator.clipboard.writeText(code).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    });
});
