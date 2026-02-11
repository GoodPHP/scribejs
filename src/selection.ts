// Scribe Editor - Selection Manager
// Selection is first-class state. This module abstracts the Range API,
// handles lifecycle (save/restore), and computes FormatState from the
// editor's internal state model — NOT from queryCommandState.

import type { SelectionState, FormatState, SelectionSnapshot } from './types';

export class SelectionManager {
  private doc: Document;
  private contentEl: HTMLElement;
  private savedSnapshots: SelectionSnapshot[] = [];
  private isComposing = false;

  constructor(doc: Document, contentEl: HTMLElement) {
    this.doc = doc;
    this.contentEl = contentEl;

    // Track IME composition for safe selection handling
    contentEl.addEventListener('compositionstart', () => { this.isComposing = true; });
    contentEl.addEventListener('compositionend', () => { this.isComposing = false; });
  }

  /** Whether an IME composition is in progress (selection operations should be deferred) */
  get composing(): boolean {
    return this.isComposing;
  }

  isSelectionInContent(): boolean {
    if (this.isComposing) return false;
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    return this.contentEl.contains(range.commonAncestorContainer);
  }

  getSelection(): SelectionState | null {
    if (this.isComposing) return null;
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let range = selection.getRangeAt(0);
    if (!this.contentEl.contains(range.commonAncestorContainer)) return null;

    // Normalize range to handle browser-specific artifacts (like triple-click selecting across blocks)
    range = this.normalizeRange(range);

    const text = selection.toString();
    const collapsed = range.collapsed;

    let rect: DOMRect | null = null;
    if (!collapsed) {
      const rects = range.getClientRects();
      if (rects.length > 0) {
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

  /**
   * Normalize range to avoid common browser-specific selection artifacts.
   * e.g., Triple-click in Chrome selects the entire block + the start of the next block.
   */
  private normalizeRange(range: Range): Range {
    const r = range.cloneRange();
    if (r.collapsed) return r;

    // Handle 'over-selection' at the start: if anchor is at the end of a node,
    // move it to the start of the next node if possible.
    if (r.startContainer.nodeType === Node.TEXT_NODE && r.startOffset === (r.startContainer as Text).length) {
      if (r.startContainer.nextSibling) {
        r.setStartBefore(r.startContainer.nextSibling);
      }
    }

    // Handle 'over-selection' where the end boundary sits at the start of the next block
    // or at the editor root itself.
    if (r.endContainer === this.contentEl && r.endOffset > 0) {
      const nodeBeforeOffset = this.contentEl.childNodes[r.endOffset - 1];
      if (nodeBeforeOffset) {
        r.setEndAfter(nodeBeforeOffset);
      }
    }

    // Shrink if it ends at the very start of any node (common after triple click)
    // Firefox/Chrome often select up to the start of the next block.
    if (r.endOffset === 0 && r.endContainer !== this.contentEl) {
      const containerNode = r.endContainer;
      r.setEndBefore(containerNode);
    }

    // Shrink if it ends after a trailing <br> (common in Firefox triple-click)
    if (r.endContainer.nodeType === Node.ELEMENT_NODE && r.endOffset > 0) {
      const lastNode = r.endContainer.childNodes[r.endOffset - 1];
      if (lastNode && lastNode.nodeName === 'BR') {
        r.setEndBefore(lastNode);
      }
    }

    return r;
  }

  /**
   * Compute FormatState by walking the DOM tree from the selection point.
   * This is the Selection Model → Editor State step in the pipeline.
   * We intentionally do NOT use queryCommandState/queryCommandValue.
   */
  getFormats(range?: Range): FormatState {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return this.getDefaultFormats();

    const targetRange = range || sel.getRangeAt(0);
    let container = targetRange.commonAncestorContainer;

    // If non-collapsed, we want the format of the first "real" content inside the range.
    // Firefox/Chrome often anchor ranges at the boundary *before* or *after* a tag.
    if (!targetRange.collapsed) {
      let experimental = targetRange.startContainer;
      let offset = targetRange.startOffset;

      // Case 1: Start is at the very end of a text node. Use the next sibling instead.
      if (experimental.nodeType === Node.TEXT_NODE && offset === (experimental as Text).length) {
        const next = experimental.nextSibling;
        if (next) {
          experimental = next;
          offset = 0;
        }
      }

      // Case 2: Start is at a boundary, sink into children to find the actual content.
      while (experimental.nodeType === Node.ELEMENT_NODE && experimental.childNodes.length > offset) {
        const child = experimental.childNodes[offset];
        if (!child) break;
        // If we hit an empty text node or a BR at the start, skip it if there's more.
        if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim() && child.nextSibling) {
          experimental = child.nextSibling;
          offset = 0;
          continue;
        }
        experimental = child;
        offset = 0;
      }
      container = experimental;
    }

    const element = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as HTMLElement;

    // Safety check: if somehow we ended up outside the content element, bail.
    if (!element || (element !== this.contentEl && !this.contentEl.contains(element))) {
      return this.getDefaultFormats();
    }

    // Use getComputedStyle from the element's own window (critical for iframes)
    const win = element.ownerDocument.defaultView || window;
    const style = win.getComputedStyle(element);

    // Firefox uses textDecorationLine; Chrome/Safari may use textDecoration
    const textDecoration = style.textDecorationLine || style.textDecoration || '';

    // fontWeight: Firefox may return 'bold' instead of '700'
    const fontWeight = style.fontWeight;
    const isBold = fontWeight === 'bold' || fontWeight === 'bolder' || parseInt(fontWeight) >= 700;

    return {
      bold: this.hasTag(element, 'b') || this.hasTag(element, 'strong') || isBold,
      italic: this.hasTag(element, 'i') || this.hasTag(element, 'em') || style.fontStyle === 'italic',
      underline: this.hasTag(element, 'u') || textDecoration.includes('underline'),
      strike: this.hasTag(element, 's') || this.hasTag(element, 'strike') || this.hasTag(element, 'del') || textDecoration.includes('line-through'),
      code: this.hasTag(element, 'code'),
      subscript: this.hasTag(element, 'sub'),
      superscript: this.hasTag(element, 'sup'),
      link: this.getLinkUrl(element),
      heading: this.getHeadingLevel(element),
      list: this.getListType(element),
      blockquote: this.hasTag(element, 'blockquote'),
      align: this.getAlignment(element, style),
      fontSize: style.fontSize || null,
      fontFamily: style.fontFamily || null,
      color: style.color || null,
      backgroundColor: this.getExplicitBackground(element),
    };
  }

  private getDefaultFormats(): FormatState {
    return {
      bold: false, italic: false, underline: false, strike: false,
      code: false, subscript: false, superscript: false,
      link: null, heading: null, list: null, blockquote: false,
      align: 'left', fontSize: null, fontFamily: null,
      color: null, backgroundColor: null,
    };
  }

  private getExplicitBackground(element: HTMLElement): string | null {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      const bg = current.style.backgroundColor;
      if (bg && bg !== 'transparent' && bg !== '') return bg;
      if (current.tagName.toLowerCase() === 'span' && bg) return bg;
      current = current.parentElement;
    }
    return null;
  }

  private hasTag(element: HTMLElement, tagName: string): boolean {
    let current: HTMLElement | null = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === tagName.toLowerCase()) return true;
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
      if (match) return parseInt(match[1]);
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
    let current: HTMLElement | null = element;

    while (current && current !== this.contentEl) {
      // 1. Check explicit inline style
      const textAlign = current.style.textAlign;
      if (textAlign && textAlign !== 'inherit' && textAlign !== '') {
        const mapped = this.mapAlign(textAlign);
        if (mapped) return mapped;
      }

      // 2. Check 'align' attribute (common in Firefox legacy output)
      const alignAttr = current.getAttribute('align');
      if (alignAttr) {
        const mapped = this.mapAlign(alignAttr);
        if (mapped) return mapped;
      }

      // 3. For block-level containers, check computed style.
      // We check recursively up to ensure we find the block providing the alignment.
      const tag = current.tagName.toLowerCase();
      const isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'article', 'section'].includes(tag);
      if (isBlock) {
        const computed = window.getComputedStyle(current).textAlign;
        const mapped = this.mapAlign(computed);
        if (mapped) return mapped;
      }

      current = current.parentElement;
    }

    // Final fallback to the initial element's computed style
    return this.mapAlign(style.textAlign) || 'left';
  }

  /** Map various alignment values (including vendor-specific) to Scribe standard */
  private mapAlign(align: string): 'left' | 'center' | 'right' | 'justify' | null {
    if (!align) return null;
    const a = align.toLowerCase();

    if (a === 'center' || a.includes('center')) return 'center'; // Handles -moz-center, -webkit-center
    if (a === 'right' || a === 'end') return 'right';
    if (a === 'justify' || a === 'full') return 'justify';
    if (a === 'left' || a === 'start') return 'left';

    return null;
  }

  // =============================================
  // Selection Lifecycle — Save / Restore
  // =============================================

  /** Save current selection with a reason tag for debugging */
  saveSelection(reason: SelectionSnapshot['reason'] = 'manual'): void {
    if (this.isComposing) return;
    const selection = this.doc.getSelection();
    if (selection && selection.rangeCount > 0) {
      const rawRange = selection.getRangeAt(0);
      this.savedSnapshots.push({
        range: this.normalizeRange(rawRange),
        timestamp: Date.now(),
        reason,
      });
    }
  }

  /** Restore the most recently saved selection */
  restoreSelection(): boolean {
    const snapshot = this.savedSnapshots.pop();
    if (!snapshot) return false;

    const selection = this.doc.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(snapshot.range);
      return true;
    }
    return false;
  }

  /** Clear all saved snapshots */
  clearSavedSelections(): void {
    this.savedSnapshots = [];
  }

  /** Get the number of saved snapshots (for debugging) */
  get snapshotCount(): number {
    return this.savedSnapshots.length;
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
    if (toStart) sel.collapseToStart();
    else sel.collapseToEnd();
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
      return { top: spanRect.top, left: spanRect.left, height: spanRect.height || 20 };
    }

    return { top: rect.top, left: rect.left, height: rect.height };
  }

  getSelectionRect(): DOMRect | null {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0).getBoundingClientRect();
  }

  getSelectionOffsets(): { start: number; end: number } | null {
    const selection = this.getSelection();
    if (!selection || !selection.range) return null;
    const range = selection.range;
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(this.contentEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return { start, end: start + range.toString().length };
  }
}
