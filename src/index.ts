// Scribe Editor - Main Export

export { createEditor, init, Scribe } from './core';
export { HTMLSanitizer } from './sanitizer';
export { SelectionManager } from './selection';
export { HistoryManager } from './history';
export { coreCommands, defaultShortcuts } from './commands';
export { defaultPlugins } from './plugins';

export type {
  EditorConfig,
  EditorInstance,
  EditorMode,
  Plugin,
  CommandHandler,
  ShortcutConfig,
  ToolbarItem,
  ToolbarConfig,
  SanitizeConfig,
  SelectionState,
  FormatState,
  HistoryEntry,
  PasteData,
} from './types';
