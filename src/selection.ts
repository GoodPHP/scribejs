// Scribe Editor - Selection Manager

import type { SelectionState, FormatState } from './types';

export class SelectionManager {
  private doc: Document;
  private contentEl: HTMLElement;
  private savedRange: Range | null = null;

  constructor(doc: Document, contentEl: HTMLElement) {
    this.doc = doc;
    this.contentEl = contentEl;
  }

  isSelectionInContent(): boolean {
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    return this.contentEl.contains(range.commonAncestorContainer);
  }

  getSelection(): SelectionState | null {
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    
    // Check if selection is within content element
    if (!this.contentEl.contains(range.commonAncestorContainer)) {
      return null;
    }

    const text = selection.toString();
    const collapsed = range.collapsed;

    // Get bounding rect - handle cases where selection spans multiple lines
    let rect: DOMRect | null = null;
    if (!collapsed) {
      const rects = range.getClientRects();
      if (rects.length > 0) {
        // Get the bounding rectangle that encompasses all rects
        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        
        const left = Math.min(firstRect.left, lastRect.left);
        const top = firstRect.top;
        const right = Math.max(firstRect.right, lastRect.right);
        const bottom = lastRect.bottom;
        
        rect = new DOMRect(left, top, right - left, bottom - top);
      }
    }

    return {
      range: range.cloneRange(),
      collapsed,
      text,
      rect,
      formats: this.getFormats(range),
    };
  }

  getFormats(range?: Range): FormatState {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return this.getDefaultFormats();

    const targetRange = range || sel.getRangeAt(0);
    const container = targetRange.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as HTMLElement;

    if (!element) {
      return this.getDefaultFormats();
    }

    const style = window.getComputedStyle(element);
    
    return {
      bold: this.hasFormat(element, 'b') || this.hasFormat(element, 'strong') || parseInt(style.fontWeight) >= 700,
      italic: this.hasFormat(element, 'i') || this.hasFormat(element, 'em') || style.fontStyle === 'italic',
      underline: this.hasFormat(element, 'u') || style.textDecoration.includes('underline'),
      strike: this.hasFormat(element, 's') || this.hasFormat(element, 'strike') || this.hasFormat(element, 'del') || style.textDecoration.includes('line-through'),
      code: this.hasFormat(element, 'code'),
      link: this.getLinkUrl(element),
      heading: this.getHeadingLevel(element),
      list: this.getListType(element),
      blockquote: this.hasFormat(element, 'blockquote'),
      align: this.getAlignment(element, style),
    };
  }

  private getDefaultFormats(): FormatState {
    return {
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      code: false,
      link: null,
      heading: null,
      list: null,
      blockquote: false,
      align: 'left',
    };
  }

  private hasFormat(element: HTMLElement, tagName: string): boolean {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === tagName.toLowerCase()) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  private getLinkUrl(element: HTMLElement): string | null {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === 'a') {
        return (current as HTMLAnchorElement).href || null;
      }
      current = current.parentElement;
    }
    return null;
  }

  private getHeadingLevel(element: HTMLElement): number | null {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      const match = current.tagName.match(/^H([1-6])$/i);
      if (match) {
        return parseInt(match[1]);
      }
      current = current.parentElement;
    }
    return null;
  }

  private getListType(element: HTMLElement): 'ordered' | 'unordered' | null {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === 'ol') return 'ordered';
      if (current.tagName.toLowerCase() === 'ul') return 'unordered';
      current = current.parentElement;
    }
    return null;
  }

  private getAlignment(element: HTMLElement, style: CSSStyleDeclaration): 'left' | 'center' | 'right' | 'justify' {
    const align = style.textAlign;
    if (align === 'center' || align === 'right' || align === 'justify') {
      return align as 'center' | 'right' | 'justify';
    }
    return 'left';
  }

  saveSelection(): void {
    const selection = this.doc.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  restoreSelection(): boolean {
    if (!this.savedRange) return false;

    const selection = this.doc.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
      return true;
    }
    return false;
  }

  clearSavedSelection(): void {
    this.savedRange = null;
  }

  setSelection(range: Range): void {
    const sel = this.doc.getSelection();
    if (!sel) return;

    sel.removeAllRanges();
    sel.addRange(range);
  }

  selectAll(): void {
    const range = this.doc.createRange();
    range.selectNodeContents(this.contentEl);
    this.setSelection(range);
  }

  collapse(toStart = false): void {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (toStart) {
      sel.collapseToStart();
    } else {
      sel.collapseToEnd();
    }
  }

  getCursorPosition(): { top: number; left: number; height: number } | null {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      const span = this.doc.createElement('span');
      span.textContent = '\u200B';
      range.insertNode(span);
      const spanRect = span.getBoundingClientRect();
      span.parentNode?.removeChild(span);
      
      return {
        top: spanRect.top,
        left: spanRect.left,
        height: spanRect.height || 20,
      };
    }

    return {
      top: rect.top,
      left: rect.left,
      height: rect.height,
    };
  }

  getSelectionRect(): DOMRect | null {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    return range.getBoundingClientRect();
  }

  // Get text offset for serialization
  getSelectionOffsets(): { start: number; end: number } | null {
    const selection = this.getSelection();
    if (!selection || !selection.range) return null;

    const range = selection.range;
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(this.contentEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    return {
      start,
      end: start + range.toString().length,
    };
  }
}
