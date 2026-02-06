// Scribe Editor - Default Plugin Pack

import type { Plugin, FormatState } from '../types';

// Bold Plugin
export const boldPlugin: Plugin = {
  name: 'bold',
  toolbarItems: [{
    name: 'bold',
    icon: 'bold',
    title: 'Bold (Ctrl+B)',
    command: 'bold',
    isActive: (state: FormatState) => state.bold,
    group: 'format',
  }],
};

// Italic Plugin
export const italicPlugin: Plugin = {
  name: 'italic',
  toolbarItems: [{
    name: 'italic',
    icon: 'italic',
    title: 'Italic (Ctrl+I)',
    command: 'italic',
    isActive: (state: FormatState) => state.italic,
    group: 'format',
  }],
};

// Underline Plugin
export const underlinePlugin: Plugin = {
  name: 'underline',
  toolbarItems: [{
    name: 'underline',
    icon: 'underline',
    title: 'Underline (Ctrl+U)',
    command: 'underline',
    isActive: (state: FormatState) => state.underline,
    group: 'format',
  }],
};

// Strike Plugin
export const strikePlugin: Plugin = {
  name: 'strike',
  toolbarItems: [{
    name: 'strike',
    icon: 'strikethrough',
    title: 'Strikethrough',
    command: 'strike',
    isActive: (state: FormatState) => state.strike,
    group: 'format',
  }],
};

// Code Plugin
export const codePlugin: Plugin = {
  name: 'code',
  toolbarItems: [{
    name: 'code',
    icon: 'code',
    title: 'Inline Code',
    command: 'code',
    isActive: (state: FormatState) => state.code,
    group: 'format',
  }],
};

// Heading Plugin
export const headingPlugin: Plugin = {
  name: 'heading',
  toolbarItems: [
    {
      name: 'h1',
      icon: 'heading1',
      title: 'Heading 1',
      command: 'heading',
      args: [1],
      isActive: (state: FormatState) => state.heading === 1,
      group: 'block',
    },
    {
      name: 'h2',
      icon: 'heading2',
      title: 'Heading 2',
      command: 'heading',
      args: [2],
      isActive: (state: FormatState) => state.heading === 2,
      group: 'block',
    },
    {
      name: 'h3',
      icon: 'heading3',
      title: 'Heading 3',
      command: 'heading',
      args: [3],
      isActive: (state: FormatState) => state.heading === 3,
      group: 'block',
    },
  ],
};

// List Plugin
export const listPlugin: Plugin = {
  name: 'list',
  toolbarItems: [
    {
      name: 'unorderedList',
      icon: 'list',
      title: 'Bullet List',
      command: 'unorderedList',
      isActive: (state: FormatState) => state.list === 'unordered',
      group: 'list',
    },
    {
      name: 'orderedList',
      icon: 'listOrdered',
      title: 'Numbered List',
      command: 'orderedList',
      isActive: (state: FormatState) => state.list === 'ordered',
      group: 'list',
    },
  ],
};

// Blockquote Plugin
export const blockquotePlugin: Plugin = {
  name: 'blockquote',
  toolbarItems: [{
    name: 'blockquote',
    icon: 'quote',
    title: 'Quote',
    command: 'blockquote',
    isActive: (state: FormatState) => state.blockquote,
    group: 'block',
  }],
};

// Link Plugin
export const linkPlugin: Plugin = {
  name: 'link',
  toolbarItems: [{
    name: 'link',
    icon: 'link',
    title: 'Link (Ctrl+K)',
    command: 'showLinkModal',
    isActive: (state: FormatState) => !!state.link,
    group: 'insert',
  }],
};

// Alignment Plugin
export const alignmentPlugin: Plugin = {
  name: 'alignment',
  toolbarItems: [
    {
      name: 'alignLeft',
      icon: 'alignLeft',
      title: 'Align Left',
      command: 'alignLeft',
      isActive: (state: FormatState) => state.align === 'left',
      group: 'align',
    },
    {
      name: 'alignCenter',
      icon: 'alignCenter',
      title: 'Align Center',
      command: 'alignCenter',
      isActive: (state: FormatState) => state.align === 'center',
      group: 'align',
    },
    {
      name: 'alignRight',
      icon: 'alignRight',
      title: 'Align Right',
      command: 'alignRight',
      isActive: (state: FormatState) => state.align === 'right',
      group: 'align',
    },
  ],
};

// Clear Format Plugin
export const clearFormatPlugin: Plugin = {
  name: 'clearFormat',
  toolbarItems: [{
    name: 'clearFormat',
    icon: 'removeFormatting',
    title: 'Clear Formatting (Ctrl+\\)',
    command: 'clearFormat',
    group: 'misc',
  }],
};

// History Plugin
export const historyPlugin: Plugin = {
  name: 'history',
  toolbarItems: [
    {
      name: 'undo',
      icon: 'undo',
      title: 'Undo (Ctrl+Z)',
      command: 'undo',
      group: 'history',
    },
    {
      name: 'redo',
      icon: 'redo',
      title: 'Redo (Ctrl+Shift+Z)',
      command: 'redo',
      group: 'history',
    },
  ],
};

// Default plugin pack
export const defaultPlugins: Plugin[] = [
  boldPlugin,
  italicPlugin,
  underlinePlugin,
  strikePlugin,
  codePlugin,
  headingPlugin,
  listPlugin,
  blockquotePlugin,
  linkPlugin,
  alignmentPlugin,
  clearFormatPlugin,
  historyPlugin,
];
