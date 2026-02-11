// Scribe Editor - Command Registry with Full Metadata
// Commands define truth. Toolbar state is resolved from command metadata + editor state.

import type { CommandMetadata, FormatState, CommandHandler, CommandCategory } from './types';

export interface CommandRegistration {
  name: string;
  label: string;
  category: CommandCategory;
  type: 'toggle' | 'apply' | 'action';
  handler: CommandHandler;
  /** Icon key for toolbar rendering (maps to ScribeIcon name) */
  icon?: string;
  /** Display group for toolbar separator logic */
  toolbarGroup?: string;
  /** Returns whether the command is currently active based on format state */
  isActive?: (state: FormatState) => boolean;
  /** Returns optional attributes (e.g., link URL) from format state */
  getAttributes?: (state: FormatState) => Record<string, unknown> | undefined;
  /** Display shortcut string */
  shortcut?: string;
  /** Whether the command requires a non-collapsed selection */
  requiresSelection?: boolean;
  /** Mutually exclusive group — only one command in the group can be active */
  exclusiveGroup?: string;
  /** Custom logic for whether the command is enabled (overrides supported default) */
  isEnabled?: (state: { format: FormatState; hasSelection: boolean; readOnly: boolean }) => boolean;
  /** Whether to show in floating toolbar (default: false) */
  floatingToolbar?: boolean;
  /** Whether to show in fixed toolbar (default: false) */
  fixedToolbar?: boolean;
  /** Optional arguments to pass when executing (e.g., heading level) */
  defaultArgs?: unknown[];
}

export class CommandRegistry {
  private commands = new Map<string, CommandRegistration>();

  register(registration: CommandRegistration): void {
    this.commands.set(registration.name, registration);
  }

  registerAll(registrations: CommandRegistration[]): void {
    registrations.forEach(r => this.register(r));
  }

  get(name: string): CommandRegistration | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  getHandler(name: string): CommandHandler | undefined {
    return this.commands.get(name)?.handler;
  }

  /** Get full command metadata for a single command */
  getCommandState(name: string, formatState: FormatState, hasSelection: boolean, readOnly: boolean): CommandMetadata | null {
    const reg = this.commands.get(name);
    if (!reg) return null;

    const active = reg.isActive ? reg.isActive(formatState) : false;
    const supported = !readOnly;
    const enabled = !readOnly && (!reg.requiresSelection || hasSelection) &&
      (reg.isEnabled ? reg.isEnabled({ format: formatState, hasSelection, readOnly }) : true);
    const attributes = reg.getAttributes ? reg.getAttributes(formatState) : undefined;

    return {
      name: reg.name,
      label: reg.label,
      category: reg.category,
      type: reg.type,
      active,
      supported,
      enabled,
      attributes,
      shortcut: reg.shortcut,
      exclusiveGroup: reg.exclusiveGroup,
      floatingToolbar: reg.floatingToolbar,
      fixedToolbar: reg.fixedToolbar,
      icon: reg.icon,
      toolbarGroup: reg.toolbarGroup,
      defaultArgs: reg.defaultArgs,
    };
  }

  /** Get metadata for all registered commands */
  getAllCommandStates(formatState: FormatState, hasSelection: boolean, readOnly: boolean): CommandMetadata[] {
    const result: CommandMetadata[] = [];
    this.commands.forEach((_, name) => {
      const state = this.getCommandState(name, formatState, hasSelection, readOnly);
      if (state) result.push(state);
    });
    return result;
  }

  /** Get commands for a specific toolbar type */
  getToolbarCommands(toolbar: 'floating' | 'fixed', formatState: FormatState, hasSelection: boolean, readOnly: boolean): CommandMetadata[] {
    const result: CommandMetadata[] = [];
    this.commands.forEach((reg, name) => {
      const show = toolbar === 'floating' ? reg.floatingToolbar : reg.fixedToolbar;
      if (!show) return;
      const state = this.getCommandState(name, formatState, hasSelection, readOnly);
      if (state) result.push(state);
    });
    return result;
  }

  /** Get all registered command names */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /** Get commands by category */
  getByCategory(category: CommandCategory): CommandRegistration[] {
    const result: CommandRegistration[] = [];
    this.commands.forEach(reg => {
      if (reg.category === category) result.push(reg);
    });
    return result;
  }

  /** Get commands in a mutually exclusive group */
  getExclusiveGroup(group: string): CommandRegistration[] {
    const result: CommandRegistration[] = [];
    this.commands.forEach(reg => {
      if (reg.exclusiveGroup === group) result.push(reg);
    });
    return result;
  }
}

/** Default command registrations with full metadata including icons and toolbar groups */
export function createDefaultRegistrations(coreCommands: Record<string, CommandHandler>): CommandRegistration[] {
  return [
    // History
    { name: 'undo', label: 'Undo', category: 'history', type: 'action', handler: coreCommands.undo, icon: 'undo', toolbarGroup: 'history', shortcut: 'Ctrl+Z', fixedToolbar: true },
    { name: 'redo', label: 'Redo', category: 'history', type: 'action', handler: coreCommands.redo, icon: 'redo', toolbarGroup: 'history', shortcut: 'Ctrl+Shift+Z', fixedToolbar: true },

    // Inline formatting - toggles
    { name: 'bold', label: 'Bold', category: 'inline', type: 'toggle', handler: coreCommands.bold, icon: 'bold', toolbarGroup: 'format', isActive: s => s.bold, isEnabled: ({ format }) => !format.code, shortcut: 'Ctrl+B', floatingToolbar: true, fixedToolbar: true },
    { name: 'italic', label: 'Italic', category: 'inline', type: 'toggle', handler: coreCommands.italic, icon: 'italic', toolbarGroup: 'format', isActive: s => s.italic, isEnabled: ({ format }) => !format.code, shortcut: 'Ctrl+I', floatingToolbar: true, fixedToolbar: true },
    { name: 'underline', label: 'Underline', category: 'inline', type: 'toggle', handler: coreCommands.underline, icon: 'underline', toolbarGroup: 'format', isActive: s => s.underline, isEnabled: ({ format }) => !format.code, shortcut: 'Ctrl+U', floatingToolbar: true, fixedToolbar: true },
    { name: 'strike', label: 'Strikethrough', category: 'inline', type: 'toggle', handler: coreCommands.strike, icon: 'strikethrough', toolbarGroup: 'format', isActive: s => s.strike, isEnabled: ({ format }) => !format.code, floatingToolbar: true, fixedToolbar: true },
    { name: 'code', label: 'Inline Code', category: 'inline', type: 'toggle', handler: coreCommands.code, icon: 'code', toolbarGroup: 'format', isActive: s => s.code, isEnabled: ({ format }) => !format.bold && !format.italic, requiresSelection: true, floatingToolbar: true, fixedToolbar: true },
    { name: 'subscript', label: 'Subscript', category: 'inline', type: 'toggle', handler: coreCommands.subscript, isActive: s => s.subscript },
    { name: 'superscript', label: 'Superscript', category: 'inline', type: 'toggle', handler: coreCommands.superscript, isActive: s => s.superscript },
    { name: 'clearFormat', label: 'Clear Formatting', category: 'inline', type: 'action', handler: coreCommands.clearFormat, icon: 'removeFormatting', toolbarGroup: 'misc', shortcut: 'Ctrl+\\', fixedToolbar: true },

    // Links
    { name: 'link', label: 'Link', category: 'insert', type: 'apply', handler: coreCommands.link, icon: 'link', toolbarGroup: 'insert', isActive: s => !!s.link, getAttributes: s => s.link ? { url: s.link } : undefined, shortcut: 'Ctrl+K', floatingToolbar: true, fixedToolbar: true },
    { name: 'unlink', label: 'Unlink', category: 'insert', type: 'action', handler: coreCommands.unlink, isActive: s => !!s.link },

    // Block formatting - with heading variants for toolbar display
    { name: 'heading1', label: 'Heading 1', category: 'block', type: 'apply', handler: coreCommands.heading, icon: 'heading1', toolbarGroup: 'block', isActive: s => s.heading === 1, exclusiveGroup: 'blockType', defaultArgs: [1], floatingToolbar: true, fixedToolbar: true },
    { name: 'heading2', label: 'Heading 2', category: 'block', type: 'apply', handler: coreCommands.heading, icon: 'heading2', toolbarGroup: 'block', isActive: s => s.heading === 2, exclusiveGroup: 'blockType', defaultArgs: [2], floatingToolbar: true, fixedToolbar: true },
    { name: 'heading3', label: 'Heading 3', category: 'block', type: 'apply', handler: coreCommands.heading, icon: 'heading3', toolbarGroup: 'block', isActive: s => s.heading === 3, exclusiveGroup: 'blockType', defaultArgs: [3], fixedToolbar: true },
    { name: 'heading', label: 'Heading', category: 'block', type: 'apply', handler: coreCommands.heading, isActive: s => s.heading !== null, exclusiveGroup: 'blockType' },
    { name: 'paragraph', label: 'Paragraph', category: 'block', type: 'apply', handler: coreCommands.paragraph, exclusiveGroup: 'blockType' },
    { name: 'blockquote', label: 'Blockquote', category: 'block', type: 'toggle', handler: coreCommands.blockquote, icon: 'quote', toolbarGroup: 'block', isActive: s => s.blockquote, floatingToolbar: true, fixedToolbar: true },
    { name: 'codeBlock', label: 'Code Block', category: 'block', type: 'apply', handler: coreCommands.codeBlock, exclusiveGroup: 'blockType' },

    // Lists - mutually exclusive
    { name: 'unorderedList', label: 'Bullet List', category: 'list', type: 'toggle', handler: coreCommands.unorderedList, icon: 'list', toolbarGroup: 'list', isActive: s => s.list === 'unordered', exclusiveGroup: 'listType', floatingToolbar: true, fixedToolbar: true },
    { name: 'orderedList', label: 'Numbered List', category: 'list', type: 'toggle', handler: coreCommands.orderedList, icon: 'listOrdered', toolbarGroup: 'list', isActive: s => s.list === 'ordered', exclusiveGroup: 'listType', floatingToolbar: true, fixedToolbar: true },

    // Alignment - mutually exclusive
    { name: 'alignLeft', label: 'Align Left', category: 'alignment', type: 'apply', handler: coreCommands.alignLeft, icon: 'alignLeft', toolbarGroup: 'align', isActive: s => s.align === 'left', exclusiveGroup: 'alignment', fixedToolbar: true },
    { name: 'alignCenter', label: 'Align Center', category: 'alignment', type: 'apply', handler: coreCommands.alignCenter, icon: 'alignCenter', toolbarGroup: 'align', isActive: s => s.align === 'center', exclusiveGroup: 'alignment', fixedToolbar: true },
    { name: 'alignRight', label: 'Align Right', category: 'alignment', type: 'apply', handler: coreCommands.alignRight, icon: 'alignRight', toolbarGroup: 'align', isActive: s => s.align === 'right', exclusiveGroup: 'alignment', fixedToolbar: true },
    { name: 'alignJustify', label: 'Justify', category: 'alignment', type: 'apply', handler: coreCommands.alignJustify, icon: 'alignJustify', toolbarGroup: 'align', isActive: s => s.align === 'justify', exclusiveGroup: 'alignment' },
    { name: 'indent', label: 'Indent', category: 'alignment', type: 'action', handler: coreCommands.indent },
    { name: 'outdent', label: 'Outdent', category: 'alignment', type: 'action', handler: coreCommands.outdent },

    // Insert
    { name: 'insertHR', label: 'Horizontal Rule', category: 'insert', type: 'action', handler: coreCommands.insertHR },
    { name: 'insertHTML', label: 'Insert HTML', category: 'insert', type: 'action', handler: coreCommands.insertHTML },
    { name: 'insertText', label: 'Insert Text', category: 'insert', type: 'action', handler: coreCommands.insertText },

    // Styling
    { name: 'setFontSize', label: 'Font Size', category: 'styling', type: 'apply', handler: coreCommands.setFontSize, getAttributes: s => s.fontSize ? { size: s.fontSize } : undefined },
    { name: 'setFontFamily', label: 'Font Family', category: 'styling', type: 'apply', handler: coreCommands.setFontFamily, getAttributes: s => s.fontFamily ? { family: s.fontFamily } : undefined },
    { name: 'setColor', label: 'Text Color', category: 'styling', type: 'apply', handler: coreCommands.setColor, getAttributes: s => s.color ? { color: s.color } : undefined },
    { name: 'setBackgroundColor', label: 'Background Color', category: 'styling', type: 'apply', handler: coreCommands.setBackgroundColor, getAttributes: s => s.backgroundColor ? { color: s.backgroundColor } : undefined },
  ];
}
