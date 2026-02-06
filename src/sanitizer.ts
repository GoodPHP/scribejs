// Scribe Editor - HTML Sanitizer for XSS Protection

import type { SanitizeConfig } from './types';

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'sup', 'sub', 'code', 'pre',
  'blockquote', 'q',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'div', 'span',
  'figure', 'figcaption',
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'id', 'style', 'data-*'],
  'a': ['href', 'target', 'rel', 'title'],
  'img': ['src', 'alt', 'width', 'height', 'title'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan', 'scope'],
};

const DEFAULT_ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

const DANGEROUS_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];

export class HTMLSanitizer {
  private config: Required<SanitizeConfig>;

  constructor(config: SanitizeConfig = {}) {
    this.config = {
      allowedTags: config.allowedTags || DEFAULT_ALLOWED_TAGS,
      allowedAttributes: config.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES,
      allowedSchemes: config.allowedSchemes || DEFAULT_ALLOWED_SCHEMES,
      stripEmpty: config.stripEmpty ?? true,
    };
  }

  sanitize(html: string): string {
    // Create a temporary container
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;

    // Process all nodes
    this.processNode(body);

    return body.innerHTML;
  }

  private processNode(node: Node): void {
    // Process children first (in reverse to handle removals)
    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
      this.processNode(children[i]);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    // Remove dangerous tags completely
    if (DANGEROUS_TAGS.includes(tagName)) {
      el.remove();
      return;
    }

    // Check if tag is allowed
    if (!this.config.allowedTags.includes(tagName)) {
      // Replace with children (unwrap)
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
      return;
    }

    // Filter attributes
    const allowedAttrs = this.getAllowedAttributes(tagName);
    const attrs = Array.from(el.attributes);
    
    for (const attr of attrs) {
      if (!this.isAttributeAllowed(attr.name, allowedAttrs)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Sanitize URLs
      if (['href', 'src'].includes(attr.name)) {
        if (!this.isUrlSafe(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }

      // Remove event handlers
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }

      // Sanitize style attribute
      if (attr.name === 'style') {
        el.setAttribute('style', this.sanitizeStyle(attr.value));
      }
    }

    // Strip empty elements if configured
    if (this.config.stripEmpty && this.isEmpty(el) && !['br', 'hr', 'img'].includes(tagName)) {
      el.remove();
    }
  }

  private getAllowedAttributes(tagName: string): string[] {
    const global = this.config.allowedAttributes['*'] || [];
    const specific = this.config.allowedAttributes[tagName] || [];
    return [...global, ...specific];
  }

  private isAttributeAllowed(attrName: string, allowedAttrs: string[]): boolean {
    if (allowedAttrs.includes(attrName)) return true;
    
    // Check for wildcard patterns like data-*
    for (const pattern of allowedAttrs) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (attrName.startsWith(prefix)) return true;
      }
    }
    
    return false;
  }

  private isUrlSafe(url: string): boolean {
    try {
      // Handle relative URLs
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return true;
      }

      // Handle data URIs for images
      if (url.startsWith('data:image/')) {
        return true;
      }

      const parsed = new URL(url, 'http://example.com');
      const scheme = parsed.protocol.slice(0, -1); // Remove trailing ':'
      
      return this.config.allowedSchemes.includes(scheme);
    } catch {
      return false;
    }
  }

  private sanitizeStyle(style: string): string {
    // Remove dangerous CSS
    const dangerous = [
      'expression',
      'javascript:',
      'behavior',
      'binding',
      '-moz-binding',
      'url(',
    ];

    let sanitized = style;
    for (const d of dangerous) {
      const regex = new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  private isEmpty(el: Element): boolean {
    return el.textContent?.trim() === '' && el.children.length === 0;
  }

  // Sanitize pasted content from Word/Google Docs
  sanitizePaste(html: string): string {
    // Remove MS Office specific tags and attributes
    let cleaned = html
      .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
      .replace(/<\/?o:[^>]*>/gi, '')
      .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?xml[^>]*>/gi, '')
      .replace(/<\/?st1:[^>]*>/gi, '')
      .replace(/class="Mso[^"]*"/gi, '')
      .replace(/style="[^"]*mso-[^"]*"/gi, '');

    // Remove Google Docs specific classes
    cleaned = cleaned
      .replace(/class="[^"]*docs-[^"]*"/gi, '')
      .replace(/id="docs-[^"]*"/gi, '');

    // Clean up extra whitespace
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><');

    return this.sanitize(cleaned);
  }
}
