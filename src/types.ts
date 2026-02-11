// Scribe Editor - Core Types

export interface EditorConfig {
  target: HTMLElement | string;
  mode?: EditorMode;
  iframe?: HTMLIFrameElement;
  plugins?: Plugin[];
  placeholder?: string;
  readOnly?: boolean;
  autofocus?: boolean;
  toolbar?: ToolbarConfig;
  sanitize?: SanitizeConfig;
  onChange?: (html: string) => void;
  onSelectionChange?: (selection: SelectionState | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export type EditorMode = 'inline' | 'block' | 'document' | 'iframe';

export interface ToolbarConfig {
  type?: 'floating' | 'fixed' | 'bubble';
  items?: string[];
  position?: 'top' | 'bottom';
}

export interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripEmpty?: boolean;
}

export interface SelectionState {
  range: Range | null;
  collapsed: boolean;
  text: string;
  rect: DOMRect | null;
  formats: FormatState;
}

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  subscript: boolean;
  superscript: boolean;
  link: string | null;
  heading: number | null;
  list: 'ordered' | 'unordered' | null;
  blockquote: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  fontSize: string | null;
  fontFamily: string | null;
  color: string | null;
  backgroundColor: string | null;
}

// =============================================
// Command Metadata System — the source of truth
// =============================================

/** Command categories for toolbar grouping and rendering */
export type CommandCategory = 'inline' | 'block' | 'list' | 'alignment' | 'insert' | 'history' | 'styling' | 'structural';

/** Full command metadata for toolbar state introspection */
export interface CommandMetadata {
  /** Command name */
  name: string;
  /** Human-readable label */
  label: string;
  /** Category for toolbar grouping */
  category: CommandCategory;
  /** Whether this command toggles, applies, or fires an action */
  type: 'toggle' | 'apply' | 'action';
  /** Whether the command is currently active on the selection */
  active: boolean;
  /** Whether the command can be applied to the current selection */
  supported: boolean;
  /** Whether the command is logically enabled (not blocked by state) */
  enabled: boolean;
  /** Optional attributes (e.g., link URL, font size, color) */
  attributes?: Record<string, unknown>;
  /** Keyboard shortcut display string */
  shortcut?: string;
  /** Mutually exclusive group — only one command in the group can be active */
  exclusiveGroup?: string;
  /** Whether this command should appear in floating toolbar */
  floatingToolbar?: boolean;
  /** Whether this command should appear in fixed toolbar */
  fixedToolbar?: boolean;
  /** Icon key for toolbar rendering */
  icon?: string;
  /** Display group for toolbar separator logic */
  toolbarGroup?: string;
  /** Default arguments for command execution */
  defaultArgs?: unknown[];
}

/** Format state change event payload */
export interface FormatStateChangeEvent {
  /** Previous format state */
  previous: FormatState | null;
  /** Current format state */
  current: FormatState;
  /** Which format properties changed */
  changed: (keyof FormatState)[];
  /** Source of the change */
  source: 'selection' | 'command' | 'input';
}

/** Selection snapshot for lifecycle management */
export interface SelectionSnapshot {
  range: Range;
  timestamp: number;
  reason: 'toolbar' | 'dropdown' | 'modal' | 'floatingUI' | 'manual';
}

export interface Plugin {
  name: string;
  init?: (editor: EditorInstance) => void;
  destroy?: () => void;
  commands?: Record<string, CommandHandler>;
  shortcuts?: ShortcutConfig[];
  toolbarItems?: ToolbarItem[];
}

export type CommandHandler = (editor: EditorInstance, ...args: unknown[]) => void;

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  command: string;
  args?: unknown[];
}

export interface ToolbarItem {
  name: string;
  icon: string;
  title: string;
  command: string;
  args?: unknown[];
  isActive?: (state: FormatState) => boolean;
  group?: string;
}

export interface EditorInstance {
  // Core methods
  getDocument(): Document;
  getContentElement(): HTMLElement;
  getSelection(): SelectionState | null;

  // Format state introspection (editor-state-driven, NOT DOM-driven)
  getFormatState(): FormatState;
  getCommandState(command: string): CommandMetadata | null;
  getAllCommandStates(): CommandMetadata[];

  // Command execution (for plugins/advanced usage)
  exec(command: string, ...args: unknown[]): void;
  canExec(command: string): boolean;

  // === Direct formatting methods ===
  bold(): void;
  italic(): void;
  underline(): void;
  strike(): void;
  code(): void;
  subscript(): void;
  superscript(): void;
  clearFormat(): void;

  // Block formatting
  heading(level: 1 | 2 | 3 | 4 | 5 | 6): void;
  paragraph(): void;
  blockquote(): void;
  codeBlock(): void;

  // Lists
  orderedList(): void;
  unorderedList(): void;

  // Alignment
  alignLeft(): void;
  alignCenter(): void;
  alignRight(): void;
  alignJustify(): void;
  indent(): void;
  outdent(): void;

  // Links
  link(url: string): void;
  unlink(): void;

  // Insert
  insertHR(): void;
  insertHTML(html: string): void;
  insertText(text: string): void;

  // Styling
  setFontSize(size: string | number): void;
  setFontFamily(font: string): void;
  setColor(color: string): void;
  setBackgroundColor(color: string): void;

  // History
  undo(): void;
  redo(): void;

  // Content methods
  getHTML(): string;
  setHTML(html: string): void;
  getText(): string;
  isEmpty(): boolean;

  // Selection lifecycle methods
  saveSelection(reason?: SelectionSnapshot['reason']): void;
  restoreSelection(): boolean;
  focus(): void;
  blur(): void;

  // DOM normalization
  normalize(): void;

  // Plugin access
  getPlugin<T extends Plugin>(name: string): T | undefined;

  // State
  isReadOnly(): boolean;
  setReadOnly(readOnly: boolean): void;

  // Event emitter
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;

  // Destroy
  destroy(): void;
}

export interface HistoryEntry {
  html: string;
  selection: { start: number; end: number } | null;
  timestamp: number;
}

export interface PasteData {
  html: string;
  text: string;
  files: File[];
}
