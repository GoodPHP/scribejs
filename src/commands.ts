// Scribe Editor - Core Commands

import type { EditorInstance, CommandHandler } from './types';

export const coreCommands: Record<string, CommandHandler> = {
  // Text formatting
  bold: (editor) => {
    editor.getDocument().execCommand('bold', false);
  },

  italic: (editor) => {
    editor.getDocument().execCommand('italic', false);
  },

  underline: (editor) => {
    editor.getDocument().execCommand('underline', false);
  },

  strike: (editor) => {
    editor.getDocument().execCommand('strikeThrough', false);
  },

  subscript: (editor) => {
    editor.getDocument().execCommand('subscript', false);
  },

  superscript: (editor) => {
    editor.getDocument().execCommand('superscript', false);
  },

  code: (editor) => {
    const selection = editor.getSelection();
    if (!selection || selection.collapsed) return;

    const doc = editor.getDocument();
    const range = selection.range;
    if (!range) return;

    // Check if already in code
    if (selection.formats.code) {
      // Remove code formatting
      const code = findParentTag(range.commonAncestorContainer, 'code');
      if (code) {
        const parent = code.parentNode;
        while (code.firstChild) {
          parent?.insertBefore(code.firstChild, code);
        }
        code.remove();
      }
    } else {
      // Wrap in code
      const codeEl = doc.createElement('code');
      codeEl.appendChild(range.extractContents());
      range.insertNode(codeEl);
    }
  },

  // Clear formatting
  clearFormat: (editor) => {
    editor.getDocument().execCommand('removeFormat', false);
  },

  // Block formatting
  heading: (editor, level: unknown) => {
    const tag = level ? `h${level}` : 'p';
    editor.getDocument().execCommand('formatBlock', false, tag);
  },

  paragraph: (editor) => {
    editor.getDocument().execCommand('formatBlock', false, 'p');
  },

  blockquote: (editor) => {
    const selection = editor.getSelection();
    if (selection?.formats.blockquote) {
      editor.getDocument().execCommand('formatBlock', false, 'p');
    } else {
      editor.getDocument().execCommand('formatBlock', false, 'blockquote');
    }
  },

  codeBlock: (editor) => {
    editor.getDocument().execCommand('formatBlock', false, 'pre');
  },

  // Lists
  orderedList: (editor) => {
    editor.getDocument().execCommand('insertOrderedList', false);
  },

  unorderedList: (editor) => {
    editor.getDocument().execCommand('insertUnorderedList', false);
  },

  // Alignment
  alignLeft: (editor) => {
    editor.getDocument().execCommand('justifyLeft', false);
  },

  alignCenter: (editor) => {
    editor.getDocument().execCommand('justifyCenter', false);
  },

  alignRight: (editor) => {
    editor.getDocument().execCommand('justifyRight', false);
  },

  alignJustify: (editor) => {
    editor.getDocument().execCommand('justifyFull', false);
  },

  // Indentation
  indent: (editor) => {
    editor.getDocument().execCommand('indent', false);
  },

  outdent: (editor) => {
    editor.getDocument().execCommand('outdent', false);
  },

  // Links
  link: (editor, url: unknown) => {
    if (typeof url !== 'string') return;

    const selection = editor.getSelection();
    if (!selection) return;

    if (selection.formats.link) {
      // Update existing link
      const range = selection.range;
      if (!range) return;

      const anchor = findParentTag(range.commonAncestorContainer, 'a') as HTMLAnchorElement | null;
      if (anchor) {
        anchor.href = url;
      }
    } else if (!selection.collapsed) {
      // Create new link
      editor.getDocument().execCommand('createLink', false, url);
    }
  },

  unlink: (editor) => {
    editor.getDocument().execCommand('unlink', false);
  },

  // Insert
  insertHR: (editor) => {
    editor.getDocument().execCommand('insertHorizontalRule', false);
  },

  insertHTML: (editor, html: unknown) => {
    if (typeof html !== 'string') return;
    editor.getDocument().execCommand('insertHTML', false, html);
  },

  insertText: (editor, text: unknown) => {
    if (typeof text !== 'string') return;
    editor.getDocument().execCommand('insertText', false, text);
  },

  // Selection
  selectAll: (editor) => {
    editor.getDocument().execCommand('selectAll', false);
  },

  // History
  undo: (editor) => {
    editor.emit('undo');
  },

  redo: (editor) => {
    editor.emit('redo');
  },

  // Font styling
  setFontSize: (editor, size: unknown) => {
    if (typeof size !== 'string' && typeof size !== 'number') return;

    const selection = editor.getSelection();
    if (!selection || selection.collapsed) return;

    const doc = editor.getDocument();
    const range = selection.range;
    if (!range) return;

    const span = doc.createElement('span');
    span.style.fontSize = typeof size === 'number' ? `${size}px` : size;
    span.appendChild(range.extractContents());
    range.insertNode(span);
  },

  setFontFamily: (editor, font: unknown) => {
    if (typeof font !== 'string') return;
    editor.getDocument().execCommand('fontName', false, font);
  },

  setColor: (editor, color: unknown) => {
    if (typeof color !== 'string') return;
    editor.getDocument().execCommand('foreColor', false, color);
  },

  setBackgroundColor: (editor, color: unknown) => {
    if (typeof color !== 'string') return;
    editor.getDocument().execCommand('hiliteColor', false, color);
  },
};

// Helper function to find parent element by tag name
function findParentTag(node: Node | null, tagName: string): Element | null {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE &&
      (current as Element).tagName.toLowerCase() === tagName.toLowerCase()) {
      return current as Element;
    }
    current = current.parentNode;
  }
  return null;
}

// Default keyboard shortcuts
export const defaultShortcuts = [
  { key: 'b', ctrl: true, command: 'bold' },
  { key: 'i', ctrl: true, command: 'italic' },
  { key: 'u', ctrl: true, command: 'underline' },
  { key: 'z', ctrl: true, command: 'undo' },
  { key: 'z', ctrl: true, shift: true, command: 'redo' },
  { key: 'y', ctrl: true, command: 'redo' },
  { key: '\\', ctrl: true, command: 'clearFormat' },
  { key: 'k', ctrl: true, command: 'link' },
];
