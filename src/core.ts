// Scribe Editor - Core Engine
// Architecture: Browser Selection → Selection Normalization → Editor State → Command Metadata → Toolbar

import type {
  EditorConfig,
  EditorInstance,
  Plugin,
  SelectionState,
  FormatState,
  FormatStateChangeEvent,
  CommandHandler,
  ShortcutConfig,
  SelectionSnapshot,
} from './types';
import { SelectionManager } from './selection';
import { HTMLSanitizer } from './sanitizer';
import { HistoryManager } from './history';
import { DOMNormalizer } from './normalizer';
import { coreCommands, defaultShortcuts } from './commands';
import { CommandRegistry, createDefaultRegistrations } from './command-registry';

export function createEditor(config: EditorConfig): EditorInstance {
  const targetEl = typeof config.target === 'string'
    ? document.querySelector<HTMLElement>(config.target)
    : config.target;

  if (!targetEl) throw new Error('Scribe: Target element not found');

  const doc = config.iframe?.contentDocument || targetEl.ownerDocument;
  if (!doc) throw new Error('Scribe: Could not access document');

  // Initialize managers
  const selectionManager = new SelectionManager(doc, targetEl);
  const sanitizer = new HTMLSanitizer(config.sanitize);
  const historyManager = new HistoryManager();
  const normalizer = new DOMNormalizer(targetEl);
  const commandRegistry = new CommandRegistry();

  // State
  let isDestroyed = false;
  let readOnly = config.readOnly ?? false;
  let lastFormatState: FormatState | null = null;
  const plugins = new Map<string, Plugin>();
  const commands = new Map<string, CommandHandler>();
  const shortcuts: ShortcutConfig[] = [...defaultShortcuts];
  const eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();

  // Setup content element
  const contentEl = targetEl;
  if (!readOnly) contentEl.contentEditable = 'true';
  contentEl.classList.add('scribe-editor', 'scribe-content');
  if (config.placeholder) contentEl.setAttribute('data-placeholder', config.placeholder);

  // Register core commands
  Object.entries(coreCommands).forEach(([name, handler]) => {
    commands.set(name, handler);
  });
  commandRegistry.registerAll(createDefaultRegistrations(coreCommands));

  // Helper: diff two format states
  const diffFormatState = (prev: FormatState | null, curr: FormatState): (keyof FormatState)[] => {
    if (!prev) return Object.keys(curr) as (keyof FormatState)[];
    const changed: (keyof FormatState)[] = [];
    for (const key of Object.keys(curr) as (keyof FormatState)[]) {
      if (prev[key] !== curr[key]) changed.push(key);
    }
    return changed;
  };

  // Helper: emit format state change event
  const emitFormatChange = (current: FormatState, source: FormatStateChangeEvent['source']) => {
    const changed = diffFormatState(lastFormatState, current);
    if (changed.length > 0) {
      const event: FormatStateChangeEvent = {
        previous: lastFormatState,
        current,
        changed,
        source,
      };
      editor.emit('formatChange', event);
    }
    lastFormatState = { ...current };
  };

  // Execute command: save selection → run handler → normalize DOM → emit events
  const executeCommand = (command: string, ...args: unknown[]) => {
    if (readOnly) return;

    // Resolve handler from registry or plugin map
    const registration = commandRegistry.get(command);
    const handler = registration?.handler || commands.get(command);

    if (handler) {
      // Use provided args or fallback to defaultArgs from registration
      const finalArgs = args.length > 0 ? args : (registration?.defaultArgs || []);

      handler(editor, ...finalArgs);

      // Post-command DOM normalization
      normalizer.normalize();

      historyManager.push(contentEl.innerHTML, null);
      editor.emit('change', contentEl.innerHTML);
      config.onChange?.(contentEl.innerHTML);

      // Emit format change synchronously for immediate toolbar update.
      // This is critical for Firefox/Safari where selectionchange may not
      // fire reliably after execCommand modifies the DOM.
      const immediateFormats = selectionManager.getFormats();
      emitFormatChange(immediateFormats, 'command');

      // Also emit selection change (deferred to let browser finalize selection)
      requestAnimationFrame(() => {
        const sel = selectionManager.getSelection();
        editor.emit('selectionChange', sel);
        // Re-emit format change in case selection shifted
        if (sel) emitFormatChange(sel.formats, 'command');
      });
    }
  };

  // Editor instance
  const editor: EditorInstance = {
    getDocument: () => doc,
    getContentElement: () => contentEl,
    getSelection: () => selectionManager.getSelection(),

    // Format state introspection — driven by editor state, NOT DOM queries
    getFormatState: () => {
      const sel = selectionManager.getSelection();
      return sel ? sel.formats : selectionManager.getFormats();
    },
    getCommandState: (command: string) => {
      const state = editor.getFormatState();
      const sel = selectionManager.getSelection();
      const hasSelection = sel ? !sel.collapsed : false;
      return commandRegistry.getCommandState(command, state, hasSelection, readOnly);
    },
    getAllCommandStates: () => {
      const state = editor.getFormatState();
      const sel = selectionManager.getSelection();
      const hasSelection = sel ? !sel.collapsed : false;
      return commandRegistry.getAllCommandStates(state, hasSelection, readOnly);
    },

    exec: (command: string, ...args: unknown[]) => executeCommand(command, ...args),
    canExec: (command: string) => {
      const state = editor.getCommandState(command);
      return !!state?.enabled;
    },

    // === Direct formatting methods ===
    bold: () => executeCommand('bold'),
    italic: () => executeCommand('italic'),
    underline: () => executeCommand('underline'),
    strike: () => executeCommand('strike'),
    code: () => executeCommand('code'),
    subscript: () => executeCommand('subscript'),
    superscript: () => executeCommand('superscript'),
    clearFormat: () => executeCommand('clearFormat'),
    heading: (level) => executeCommand('heading', level),
    paragraph: () => executeCommand('paragraph'),
    blockquote: () => executeCommand('blockquote'),
    codeBlock: () => executeCommand('codeBlock'),
    orderedList: () => executeCommand('orderedList'),
    unorderedList: () => executeCommand('unorderedList'),
    alignLeft: () => executeCommand('alignLeft'),
    alignCenter: () => executeCommand('alignCenter'),
    alignRight: () => executeCommand('alignRight'),
    alignJustify: () => executeCommand('alignJustify'),
    indent: () => executeCommand('indent'),
    outdent: () => executeCommand('outdent'),
    link: (url) => executeCommand('link', url),
    unlink: () => executeCommand('unlink'),
    insertHR: () => executeCommand('insertHR'),
    insertHTML: (html) => executeCommand('insertHTML', html),
    insertText: (text) => executeCommand('insertText', text),
    setFontSize: (size) => executeCommand('setFontSize', size),
    setFontFamily: (font) => executeCommand('setFontFamily', font),
    setColor: (color) => executeCommand('setColor', color),
    setBackgroundColor: (color) => executeCommand('setBackgroundColor', color),
    undo: () => editor.emit('undo'),
    redo: () => editor.emit('redo'),

    // Content methods
    getHTML: () => contentEl.innerHTML,
    setHTML: (html) => {
      const sanitized = sanitizer.sanitize(html);
      contentEl.innerHTML = sanitized;
      normalizer.normalize();
      historyManager.pushImmediate(sanitized, null);
      editor.emit('change', sanitized);
    },
    getText: () => contentEl.textContent || '',
    isEmpty: () => {
      const text = contentEl.textContent?.trim() || '';
      return text === '' && contentEl.children.length <= 1;
    },

    // Selection lifecycle
    saveSelection: (reason?: SelectionSnapshot['reason']) => selectionManager.saveSelection(reason || 'manual'),
    restoreSelection: () => {
      const restored = selectionManager.restoreSelection();
      if (restored) {
        const sel = selectionManager.getSelection();
        editor.emit('selectionChange', sel);
        if (sel) emitFormatChange(sel.formats, 'selection');
      }
      return restored;
    },
    focus: () => {
      contentEl.focus();
      editor.restoreSelection();
      editor.emit('focus');
    },
    blur: () => contentEl.blur(),

    // DOM normalization (public API for plugins)
    normalize: () => normalizer.normalize(),

    // Plugin access
    getPlugin: <T extends Plugin>(name: string) => plugins.get(name) as T | undefined,

    // State
    isReadOnly: () => readOnly,
    setReadOnly: (value) => {
      readOnly = value;
      contentEl.contentEditable = value ? 'false' : 'true';
      editor.emit('readOnlyChange', value);
    },

    // Event emitter
    on: (event, handler) => {
      if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
      eventHandlers.get(event)!.add(handler);
    },
    off: (event, handler) => { eventHandlers.get(event)?.delete(handler); },
    emit: (event, ...args) => { eventHandlers.get(event)?.forEach(h => h(...args)); },

    // Destroy
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      plugins.forEach(plugin => plugin.destroy?.());
      plugins.clear();
      contentEl.removeEventListener('input', handleInput);
      contentEl.removeEventListener('keydown', handleKeyDown);
      contentEl.removeEventListener('keyup', handleKeyUp);
      contentEl.removeEventListener('mouseup', handleMouseUp);
      contentEl.removeEventListener('paste', handlePaste);
      contentEl.removeEventListener('focus', handleFocus);
      contentEl.removeEventListener('blur', handleBlur);
      doc.removeEventListener('selectionchange', handleSelectionChange);
      contentEl.contentEditable = 'false';
      contentEl.classList.remove('scribe-editor', 'scribe-content');
      contentEl.removeAttribute('data-placeholder');
      eventHandlers.clear();
      historyManager.clear();
      editor.emit('destroy');
    },
  };

  // Event handlers
  const handleInput = () => {
    if (readOnly) return;
    historyManager.push(contentEl.innerHTML, null);
    editor.emit('change', contentEl.innerHTML);
    config.onChange?.(contentEl.innerHTML);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        executeCommand(shortcut.command, ...(shortcut.args || []));
        return;
      }
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');
    if (html) {
      const sanitized = sanitizer.sanitizePaste(html);
      executeCommand('insertHTML', sanitized);
    } else if (text) {
      executeCommand('insertText', text);
    }
  };

  const handleFocus = () => { editor.emit('focus'); config.onFocus?.(); };
  const handleBlur = () => { editor.emit('blur'); config.onBlur?.(); };

  let selectionUpdateId: number | null = null;
  const handleSelectionChange = () => {
    if (selectionUpdateId) cancelAnimationFrame(selectionUpdateId);
    selectionUpdateId = requestAnimationFrame(() => {
      if (isDestroyed) return;

      const isInContent = selectionManager.isSelectionInContent();
      if (!isInContent) {
        // If we were previously focused, but selection moved elsewhere,
        // notify observers to clear the toolbar/active state.
        editor.emit('selectionChange', null);
        return;
      }

      const selection = selectionManager.getSelection();
      editor.emit('selectionChange', selection);
      config.onSelectionChange?.(selection);

      // Always emit formatChange — even for collapsed selections (cursor moves).
      // This ensures toolbar updates for both range and caret positions.
      const formats = selection ? selection.formats : selectionManager.getFormats();
      emitFormatChange(formats, 'selection');
    });
  };

  // Firefox/Safari don't reliably fire 'selectionchange' on the document
  // for contentEditable elements. These fallbacks ensure toolbar state updates.
  const handleMouseUp = () => {
    // Defer to let the browser finalize the selection
    setTimeout(handleSelectionChange, 10);
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    // Arrow keys, Home, End, and any key that might move the caret
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    if (navKeys.includes(e.key) || e.key.length === 1) {
      handleSelectionChange();
    }
  };

  // Handle undo/redo
  editor.on('undo', () => {
    const entry = historyManager.undo();
    if (entry) { contentEl.innerHTML = entry.html; editor.emit('change', entry.html); }
  });
  editor.on('redo', () => {
    const entry = historyManager.redo();
    if (entry) { contentEl.innerHTML = entry.html; editor.emit('change', entry.html); }
  });

  // Register event listeners
  contentEl.addEventListener('input', handleInput);
  contentEl.addEventListener('keydown', handleKeyDown);
  contentEl.addEventListener('keyup', handleKeyUp);
  contentEl.addEventListener('mouseup', handleMouseUp);
  contentEl.addEventListener('paste', handlePaste);
  contentEl.addEventListener('focus', handleFocus);
  contentEl.addEventListener('blur', handleBlur);
  doc.addEventListener('selectionchange', handleSelectionChange);

  // Initialize plugins
  config.plugins?.forEach(plugin => {
    plugins.set(plugin.name, plugin);
    if (plugin.commands) {
      Object.entries(plugin.commands).forEach(([name, handler]) => {
        commands.set(name, handler);
      });
    }
    if (plugin.shortcuts) shortcuts.push(...plugin.shortcuts);
    plugin.init?.(editor);
  });

  // Initialize history
  historyManager.pushImmediate(contentEl.innerHTML, null);
  if (config.autofocus) setTimeout(() => editor.focus(), 0);
  editor.emit('ready');

  return editor;
}

// Simple init function for vanilla JS
export function init(selector: string, options: Partial<EditorConfig> = {}): EditorInstance {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) throw new Error(`Scribe: Element "${selector}" not found`);
  return createEditor({ target, mode: 'inline', ...options });
}

// Global Scribe object for script tag usage
export const Scribe = { init, createEditor };
