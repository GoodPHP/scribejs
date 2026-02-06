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
  link: string | null;
  heading: number | null;
  list: 'ordered' | 'unordered' | null;
  blockquote: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
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
  
  // Selection methods
  saveSelection(): void;
  restoreSelection(): void;
  focus(): void;
  blur(): void;
  
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
