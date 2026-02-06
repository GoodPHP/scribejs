// Scribe Editor - History Management (Undo/Redo)

import type { HistoryEntry } from './types';

export class HistoryManager {
  private stack: HistoryEntry[] = [];
  private position = -1;
  private maxSize: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceDelay = 300;
  private lastContent = '';

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(html: string, selection: { start: number; end: number } | null): void {
    // Skip if content hasn't changed
    if (html === this.lastContent) return;
    this.lastContent = html;

    // Debounce rapid changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.addEntry(html, selection);
    }, this.debounceDelay);
  }

  pushImmediate(html: string, selection: { start: number; end: number } | null): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (html !== this.lastContent) {
      this.lastContent = html;
      this.addEntry(html, selection);
    }
  }

  private addEntry(html: string, selection: { start: number; end: number } | null): void {
    // Remove any entries after current position (for new branches)
    this.stack = this.stack.slice(0, this.position + 1);

    // Add new entry
    this.stack.push({
      html,
      selection,
      timestamp: Date.now(),
    });

    // Limit stack size
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.position++;
    }
  }

  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    this.position--;
    return this.stack[this.position];
  }

  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    this.position++;
    return this.stack[this.position];
  }

  canUndo(): boolean {
    return this.position > 0;
  }

  canRedo(): boolean {
    return this.position < this.stack.length - 1;
  }

  getCurrent(): HistoryEntry | null {
    if (this.position < 0 || this.position >= this.stack.length) {
      return null;
    }
    return this.stack[this.position];
  }

  clear(): void {
    this.stack = [];
    this.position = -1;
    this.lastContent = '';
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  getStackSize(): number {
    return this.stack.length;
  }

  getPosition(): number {
    return this.position;
  }
}
