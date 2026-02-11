// Scribe Editor - DOM Normalization Pipeline
// Runs after command execution to clean up browser-generated artifacts.
// The DOM is the view layer — normalization ensures consistent, clean output.

/**
 * DOM Normalization Pipeline
 * 
 * Phase 1: Merge adjacent identical inline nodes
 * Phase 2: Remove empty inline nodes  
 * Phase 3: Flatten unnecessarily nested inline nodes
 * Phase 4: Clean whitespace and NBSP artifacts
 * Phase 5: Remove browser junk nodes (zero-width spaces, empty spans)
 */
export class DOMNormalizer {
  private contentEl: HTMLElement;

  /** Inline tags that can be merged when adjacent and identical */
  private static INLINE_TAGS = new Set([
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'sub', 'sup', 'code', 'span', 'a', 'mark',
  ]);

  /** Tags that should never be removed even if empty */
  private static PRESERVE_EMPTY = new Set(['br', 'hr', 'img', 'input']);

  constructor(contentEl: HTMLElement) {
    this.contentEl = contentEl;
  }

  /** Run the full normalization pipeline */
  normalize(): void {
    this.mergeAdjacentInlines(this.contentEl);
    this.removeEmptyNodes(this.contentEl);
    this.flattenNestedInlines(this.contentEl);
    this.cleanWhitespace(this.contentEl);
    this.removeBrowserJunk(this.contentEl);
    // Use the native normalize to merge adjacent text nodes
    this.contentEl.normalize();
  }

  /**
   * Phase 1: Merge adjacent identical inline nodes
   * e.g., <strong>hello</strong><strong> world</strong> → <strong>hello world</strong>
   */
  private mergeAdjacentInlines(root: Node): void {
    const children = Array.from(root.childNodes);
    
    for (let i = 0; i < children.length - 1; i++) {
      const current = children[i];
      const next = children[i + 1];

      if (
        current.nodeType === Node.ELEMENT_NODE &&
        next.nodeType === Node.ELEMENT_NODE
      ) {
        const currEl = current as HTMLElement;
        const nextEl = next as HTMLElement;

        if (this.canMerge(currEl, nextEl)) {
          // Move all children of next into current
          while (nextEl.firstChild) {
            currEl.appendChild(nextEl.firstChild);
          }
          nextEl.remove();
          // Re-check from same index since we modified the list
          i--;
          continue;
        }
      }

      // Recurse into element children
      if (current.nodeType === Node.ELEMENT_NODE) {
        this.mergeAdjacentInlines(current);
      }
    }

    // Handle last child
    const lastChild = root.lastChild;
    if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
      this.mergeAdjacentInlines(lastChild);
    }
  }

  /** Check if two elements can be merged (same tag, same attributes) */
  private canMerge(a: HTMLElement, b: HTMLElement): boolean {
    if (a.tagName !== b.tagName) return false;
    if (!DOMNormalizer.INLINE_TAGS.has(a.tagName.toLowerCase())) return false;

    // Compare attributes
    if (a.attributes.length !== b.attributes.length) return false;
    for (let i = 0; i < a.attributes.length; i++) {
      const attr = a.attributes[i];
      if (b.getAttribute(attr.name) !== attr.value) return false;
    }
    return true;
  }

  /**
   * Phase 2: Remove empty inline nodes
   * e.g., <strong></strong> → removed
   */
  private removeEmptyNodes(root: Node): void {
    const children = Array.from(root.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Recurse first
        this.removeEmptyNodes(el);

        // Remove if empty and not a preserved tag
        if (
          DOMNormalizer.INLINE_TAGS.has(tag) &&
          !DOMNormalizer.PRESERVE_EMPTY.has(tag) &&
          !el.hasChildNodes() &&
          !el.textContent?.trim()
        ) {
          el.remove();
        }
      }
    }
  }

  /**
   * Phase 3: Flatten unnecessarily nested inline nodes
   * e.g., <strong><strong>text</strong></strong> → <strong>text</strong>
   */
  private flattenNestedInlines(root: Node): void {
    const children = Array.from(root.childNodes);

    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Recurse first
      this.flattenNestedInlines(el);

      if (!DOMNormalizer.INLINE_TAGS.has(tag)) continue;

      // Check if the only child is the same tag
      if (
        el.childNodes.length === 1 &&
        el.firstChild?.nodeType === Node.ELEMENT_NODE
      ) {
        const innerEl = el.firstChild as HTMLElement;
        if (innerEl.tagName === el.tagName && this.canMerge(el, innerEl)) {
          // Unwrap inner: move its children into outer, remove inner
          while (innerEl.firstChild) {
            el.insertBefore(innerEl.firstChild, innerEl);
          }
          innerEl.remove();
        }
      }
    }
  }

  /**
   * Phase 4: Clean whitespace and NBSP artifacts
   * - Replace &nbsp; sequences with spaces where safe
   * - Collapse multiple spaces in text nodes
   */
  private cleanWhitespace(root: Node): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      textNodes.push(node);
    }

    for (const textNode of textNodes) {
      let text = textNode.textContent || '';

      // Don't modify content inside <pre> or <code>
      if (this.isInsidePreformatted(textNode)) continue;

      // Replace sequences of &nbsp; (\u00A0) with regular spaces
      // but preserve single &nbsp; used for intentional non-breaking spaces
      text = text.replace(/\u00A0{2,}/g, (match) => ' '.repeat(match.length));

      // Collapse multiple spaces (but preserve single spaces)
      text = text.replace(/ {3,}/g, '  ');

      if (text !== textNode.textContent) {
        textNode.textContent = text;
      }
    }
  }

  /**
   * Phase 5: Remove browser junk nodes
   * - Zero-width space characters (used by browsers for caret positioning)
   * - Empty spans with no attributes
   * - Orphaned <br> inside inline elements
   */
  private removeBrowserJunk(root: Node): void {
    const children = Array.from(root.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        // Remove text nodes that are ONLY zero-width spaces
        if (child.textContent === '\u200B' || child.textContent === '\uFEFF') {
          child.remove();
          continue;
        }
        // Strip zero-width spaces from within text (but keep the rest)
        if (child.textContent && /[\u200B\uFEFF]/.test(child.textContent)) {
          child.textContent = child.textContent.replace(/[\u200B\uFEFF]/g, '');
        }
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Remove empty spans with no meaningful attributes
        if (
          tag === 'span' &&
          !el.hasAttribute('style') &&
          !el.hasAttribute('class') &&
          !el.hasAttribute('data-type') &&
          el.attributes.length === 0
        ) {
          // Unwrap: move children out
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }

        // Recurse
        this.removeBrowserJunk(el);
      }
    }
  }

  /** Check if a node is inside a <pre> or <code> block */
  private isInsidePreformatted(node: Node): boolean {
    let current: Node | null = node.parentNode;
    while (current && current !== this.contentEl) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const tag = (current as HTMLElement).tagName.toLowerCase();
        if (tag === 'pre' || tag === 'code') return true;
      }
      current = current.parentNode;
    }
    return false;
  }
}
