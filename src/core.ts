// Scribe Editor - Core Engine with Direct Methods

import type { 
  EditorConfig, 
  EditorInstance, 
  Plugin, 
  SelectionState, 
  CommandHandler,
  ShortcutConfig 
} from './types';
import { SelectionManager } from './selection';
import { HTMLSanitizer } from './sanitizer';
import { HistoryManager } from './history';
import { coreCommands, defaultShortcuts } from './commands';

export function createEditor(config: EditorConfig): EditorInstance {
  // Resolve target element
  const targetEl = typeof config.target === 'string' 
    ? document.querySelector<HTMLElement>(config.target)
    : config.target;

  if (!targetEl) {
    throw new Error('Scribe: Target element not found');
  }

  // Get document context (supports iframe)
  const doc = config.iframe?.contentDocument || targetEl.ownerDocument;
  if (!doc) {
    throw new Error('Scribe: Could not access document');
  }

  // Initialize managers
  const selectionManager = new SelectionManager(doc, targetEl);
  const sanitizer = new HTMLSanitizer(config.sanitize);
  const historyManager = new HistoryManager();

  // State
  let isDestroyed = false;
  let readOnly = config.readOnly ?? false;
  const plugins = new Map<string, Plugin>();
  const commands = new Map<string, CommandHandler>();
  const shortcuts: ShortcutConfig[] = [...defaultShortcuts];
  const eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();

  // Setup content element
  const contentEl = targetEl;
  if (!readOnly) {
    contentEl.contentEditable = 'true';
  }
  contentEl.classList.add('scribe-editor', 'scribe-content');
  
  if (config.placeholder) {
    contentEl.setAttribute('data-placeholder', config.placeholder);
  }

  // Register core commands
  Object.entries(coreCommands).forEach(([name, handler]) => {
    commands.set(name, handler);
  });

  // Helper to execute command and emit events
  const executeCommand = (command: string, ...args: unknown[]) => {
    if (readOnly) return;
    
    const handler = commands.get(command);
    if (handler) {
      handler(editor, ...args);
      historyManager.push(contentEl.innerHTML, null);
      editor.emit('change', contentEl.innerHTML);
      config.onChange?.(contentEl.innerHTML);
      
      // Delayed selection update to ensure DOM has updated
      requestAnimationFrame(() => {
        editor.emit('selectionChange', selectionManager.getSelection());
      });
    }
  };

  // Editor instance with direct methods
  const editor: EditorInstance = {
    // Core accessors
    getDocument: () => doc,
    getContentElement: () => contentEl,
    getSelection: () => selectionManager.getSelection(),

    // Command execution (still available for plugins)
    exec: (command: string, ...args: unknown[]) => executeCommand(command, ...args),
    canExec: (command: string) => commands.has(command) && !readOnly,

    // === Direct formatting methods (no exec needed) ===
    bold: () => executeCommand('bold'),
    italic: () => executeCommand('italic'),
    underline: () => executeCommand('underline'),
    strike: () => executeCommand('strike'),
    code: () => executeCommand('code'),
    subscript: () => executeCommand('subscript'),
    superscript: () => executeCommand('superscript'),
    clearFormat: () => executeCommand('clearFormat'),

    // Block formatting
    heading: (level: 1 | 2 | 3 | 4 | 5 | 6) => executeCommand('heading', level),
    paragraph: () => executeCommand('paragraph'),
    blockquote: () => executeCommand('blockquote'),
    codeBlock: () => executeCommand('codeBlock'),

    // Lists
    orderedList: () => executeCommand('orderedList'),
    unorderedList: () => executeCommand('unorderedList'),

    // Alignment
    alignLeft: () => executeCommand('alignLeft'),
    alignCenter: () => executeCommand('alignCenter'),
    alignRight: () => executeCommand('alignRight'),
    alignJustify: () => executeCommand('alignJustify'),
    indent: () => executeCommand('indent'),
    outdent: () => executeCommand('outdent'),

    // Links
    link: (url: string) => executeCommand('link', url),
    unlink: () => executeCommand('unlink'),

    // Insert
    insertHR: () => executeCommand('insertHR'),
    insertHTML: (html: string) => executeCommand('insertHTML', html),
    insertText: (text: string) => executeCommand('insertText', text),

    // Styling
    setFontSize: (size: string | number) => executeCommand('setFontSize', size),
    setFontFamily: (font: string) => executeCommand('setFontFamily', font),
    setColor: (color: string) => executeCommand('setColor', color),
    setBackgroundColor: (color: string) => executeCommand('setBackgroundColor', color),

    // History
    undo: () => editor.emit('undo'),
    redo: () => editor.emit('redo'),

    // Content methods
    getHTML: () => contentEl.innerHTML,
    
    setHTML: (html: string) => {
      const sanitized = sanitizer.sanitize(html);
      contentEl.innerHTML = sanitized;
      historyManager.pushImmediate(sanitized, null);
      editor.emit('change', sanitized);
    },

    getText: () => contentEl.textContent || '',
    
    isEmpty: () => {
      const text = contentEl.textContent?.trim() || '';
      return text === '' && contentEl.children.length <= 1;
    },

    // Selection methods
    saveSelection: () => selectionManager.saveSelection(),
    restoreSelection: () => selectionManager.restoreSelection(),
    
    focus: () => {
      contentEl.focus();
      selectionManager.restoreSelection();
    },
    
    blur: () => contentEl.blur(),

    // Plugin access
    getPlugin: <T extends Plugin>(name: string) => plugins.get(name) as T | undefined,

    // State
    isReadOnly: () => readOnly,
    
    setReadOnly: (value: boolean) => {
      readOnly = value;
      contentEl.contentEditable = value ? 'false' : 'true';
      editor.emit('readOnlyChange', value);
    },

    // Event emitter
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    },

    off: (event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.get(event)?.delete(handler);
    },

    emit: (event: string, ...args: unknown[]) => {
      eventHandlers.get(event)?.forEach(handler => handler(...args));
    },

    // Destroy
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;

      // Destroy plugins
      plugins.forEach(plugin => plugin.destroy?.());
      plugins.clear();

      // Remove event listeners
      contentEl.removeEventListener('input', handleInput);
      contentEl.removeEventListener('keydown', handleKeyDown);
      contentEl.removeEventListener('paste', handlePaste);
      contentEl.removeEventListener('focus', handleFocus);
      contentEl.removeEventListener('blur', handleBlur);
      doc.removeEventListener('selectionchange', handleSelectionChange);

      // Cleanup
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

    // Check shortcuts
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

  const handleFocus = () => {
    editor.emit('focus');
    config.onFocus?.();
  };

  const handleBlur = () => {
    editor.emit('blur');
    config.onBlur?.();
  };

  const handleSelectionChange = () => {
    if (!selectionManager.isSelectionInContent()) return;
    
    const selection = selectionManager.getSelection();
    editor.emit('selectionChange', selection);
    config.onSelectionChange?.(selection);
  };

  // Handle undo/redo
  editor.on('undo', () => {
    const entry = historyManager.undo();
    if (entry) {
      contentEl.innerHTML = entry.html;
      editor.emit('change', entry.html);
    }
  });

  editor.on('redo', () => {
    const entry = historyManager.redo();
    if (entry) {
      contentEl.innerHTML = entry.html;
      editor.emit('change', entry.html);
    }
  });

  // Register event listeners
  contentEl.addEventListener('input', handleInput);
  contentEl.addEventListener('keydown', handleKeyDown);
  contentEl.addEventListener('paste', handlePaste);
  contentEl.addEventListener('focus', handleFocus);
  contentEl.addEventListener('blur', handleBlur);
  doc.addEventListener('selectionchange', handleSelectionChange);

  // Initialize plugins
  config.plugins?.forEach(plugin => {
    plugins.set(plugin.name, plugin);
    
    // Register plugin commands
    if (plugin.commands) {
      Object.entries(plugin.commands).forEach(([name, handler]) => {
        commands.set(name, handler);
      });
    }
    
    // Register plugin shortcuts
    if (plugin.shortcuts) {
      shortcuts.push(...plugin.shortcuts);
    }
    
    // Initialize plugin
    plugin.init?.(editor);
  });

  // Initialize history with current content
  historyManager.pushImmediate(contentEl.innerHTML, null);

  // Autofocus
  if (config.autofocus) {
    setTimeout(() => editor.focus(), 0);
  }

  editor.emit('ready');

  return editor;
}

// Simple init function for vanilla JS
export function init(selector: string, options: Partial<EditorConfig> = {}): EditorInstance {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) {
    throw new Error(`Scribe: Element "${selector}" not found`);
  }
  
  return createEditor({
    target,
    mode: 'inline',
    ...options,
  });
}

// Global Scribe object for script tag usage
export const Scribe = {
  init,
  createEditor,
};
