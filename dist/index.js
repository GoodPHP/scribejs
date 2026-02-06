/* scribejs-editor v0.1.0 */

// src/selection.ts
var SelectionManager = class {
  constructor(doc, contentEl) {
    this.savedRange = null;
    this.doc = doc;
    this.contentEl = contentEl;
  }
  isSelectionInContent() {
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    return this.contentEl.contains(range.commonAncestorContainer);
  }
  getSelection() {
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!this.contentEl.contains(range.commonAncestorContainer)) {
      return null;
    }
    const text = selection.toString();
    const collapsed = range.collapsed;
    let rect = null;
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
      formats: this.getFormats(range)
    };
  }
  getFormats(range) {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return this.getDefaultFormats();
    const targetRange = range || sel.getRangeAt(0);
    const container = targetRange.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    if (!element) {
      return this.getDefaultFormats();
    }
    const style = window.getComputedStyle(element);
    return {
      bold: this.hasFormat(element, "b") || this.hasFormat(element, "strong") || parseInt(style.fontWeight) >= 700,
      italic: this.hasFormat(element, "i") || this.hasFormat(element, "em") || style.fontStyle === "italic",
      underline: this.hasFormat(element, "u") || style.textDecoration.includes("underline"),
      strike: this.hasFormat(element, "s") || this.hasFormat(element, "strike") || this.hasFormat(element, "del") || style.textDecoration.includes("line-through"),
      code: this.hasFormat(element, "code"),
      link: this.getLinkUrl(element),
      heading: this.getHeadingLevel(element),
      list: this.getListType(element),
      blockquote: this.hasFormat(element, "blockquote"),
      align: this.getAlignment(element, style)
    };
  }
  getDefaultFormats() {
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
      align: "left"
    };
  }
  hasFormat(element, tagName) {
    let current = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === tagName.toLowerCase()) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
  getLinkUrl(element) {
    let current = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === "a") {
        return current.href || null;
      }
      current = current.parentElement;
    }
    return null;
  }
  getHeadingLevel(element) {
    let current = element;
    while (current && current !== this.contentEl) {
      const match = current.tagName.match(/^H([1-6])$/i);
      if (match) {
        return parseInt(match[1]);
      }
      current = current.parentElement;
    }
    return null;
  }
  getListType(element) {
    let current = element;
    while (current && current !== this.contentEl) {
      if (current.tagName.toLowerCase() === "ol") return "ordered";
      if (current.tagName.toLowerCase() === "ul") return "unordered";
      current = current.parentElement;
    }
    return null;
  }
  getAlignment(element, style) {
    const align = style.textAlign;
    if (align === "center" || align === "right" || align === "justify") {
      return align;
    }
    return "left";
  }
  saveSelection() {
    const selection = this.doc.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
    }
  }
  restoreSelection() {
    if (!this.savedRange) return false;
    const selection = this.doc.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
      return true;
    }
    return false;
  }
  clearSavedSelection() {
    this.savedRange = null;
  }
  setSelection(range) {
    const sel = this.doc.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }
  selectAll() {
    const range = this.doc.createRange();
    range.selectNodeContents(this.contentEl);
    this.setSelection(range);
  }
  collapse(toStart = false) {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (toStart) {
      sel.collapseToStart();
    } else {
      sel.collapseToEnd();
    }
  }
  getCursorPosition() {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const span = this.doc.createElement("span");
      span.textContent = "\u200B";
      range.insertNode(span);
      const spanRect = span.getBoundingClientRect();
      span.parentNode?.removeChild(span);
      return {
        top: spanRect.top,
        left: spanRect.left,
        height: spanRect.height || 20
      };
    }
    return {
      top: rect.top,
      left: rect.left,
      height: rect.height
    };
  }
  getSelectionRect() {
    const sel = this.doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    return range.getBoundingClientRect();
  }
  // Get text offset for serialization
  getSelectionOffsets() {
    const selection = this.getSelection();
    if (!selection || !selection.range) return null;
    const range = selection.range;
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(this.contentEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return {
      start,
      end: start + range.toString().length
    };
  }
};

// src/sanitizer.ts
var DEFAULT_ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "sup",
  "sub",
  "code",
  "pre",
  "blockquote",
  "q",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "div",
  "span",
  "figure",
  "figcaption"
];
var DEFAULT_ALLOWED_ATTRIBUTES = {
  "*": ["class", "id", "style", "data-*"],
  "a": ["href", "target", "rel", "title"],
  "img": ["src", "alt", "width", "height", "title"],
  "td": ["colspan", "rowspan"],
  "th": ["colspan", "rowspan", "scope"]
};
var DEFAULT_ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
var DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "form", "input", "button"];
var HTMLSanitizer = class {
  constructor(config = {}) {
    this.config = {
      allowedTags: config.allowedTags || DEFAULT_ALLOWED_TAGS,
      allowedAttributes: config.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES,
      allowedSchemes: config.allowedSchemes || DEFAULT_ALLOWED_SCHEMES,
      stripEmpty: config.stripEmpty ?? true
    };
  }
  sanitize(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const body = doc.body;
    this.processNode(body);
    return body.innerHTML;
  }
  processNode(node) {
    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
      this.processNode(children[i]);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    const tagName = el.tagName.toLowerCase();
    if (DANGEROUS_TAGS.includes(tagName)) {
      el.remove();
      return;
    }
    if (!this.config.allowedTags.includes(tagName)) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
      return;
    }
    const allowedAttrs = this.getAllowedAttributes(tagName);
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!this.isAttributeAllowed(attr.name, allowedAttrs)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (["href", "src"].includes(attr.name)) {
        if (!this.isUrlSafe(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
      if (attr.name === "style") {
        el.setAttribute("style", this.sanitizeStyle(attr.value));
      }
    }
    if (this.config.stripEmpty && this.isEmpty(el) && !["br", "hr", "img"].includes(tagName)) {
      el.remove();
    }
  }
  getAllowedAttributes(tagName) {
    const global = this.config.allowedAttributes["*"] || [];
    const specific = this.config.allowedAttributes[tagName] || [];
    return [...global, ...specific];
  }
  isAttributeAllowed(attrName, allowedAttrs) {
    if (allowedAttrs.includes(attrName)) return true;
    for (const pattern of allowedAttrs) {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        if (attrName.startsWith(prefix)) return true;
      }
    }
    return false;
  }
  isUrlSafe(url) {
    try {
      if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
        return true;
      }
      if (url.startsWith("data:image/")) {
        return true;
      }
      const parsed = new URL(url, "http://example.com");
      const scheme = parsed.protocol.slice(0, -1);
      return this.config.allowedSchemes.includes(scheme);
    } catch {
      return false;
    }
  }
  sanitizeStyle(style) {
    const dangerous = [
      "expression",
      "javascript:",
      "behavior",
      "binding",
      "-moz-binding",
      "url("
    ];
    let sanitized = style;
    for (const d of dangerous) {
      const regex = new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      sanitized = sanitized.replace(regex, "");
    }
    return sanitized;
  }
  isEmpty(el) {
    return el.textContent?.trim() === "" && el.children.length === 0;
  }
  // Sanitize pasted content from Word/Google Docs
  sanitizePaste(html) {
    let cleaned = html.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, "").replace(/<\/?o:[^>]*>/gi, "").replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?xml[^>]*>/gi, "").replace(/<\/?st1:[^>]*>/gi, "").replace(/class="Mso[^"]*"/gi, "").replace(/style="[^"]*mso-[^"]*"/gi, "");
    cleaned = cleaned.replace(/class="[^"]*docs-[^"]*"/gi, "").replace(/id="docs-[^"]*"/gi, "");
    cleaned = cleaned.replace(/\s+/g, " ").replace(/>\s+</g, "><");
    return this.sanitize(cleaned);
  }
};

// src/history.ts
var HistoryManager = class {
  constructor(maxSize = 100) {
    this.stack = [];
    this.position = -1;
    this.debounceTimer = null;
    this.debounceDelay = 300;
    this.lastContent = "";
    this.maxSize = maxSize;
  }
  push(html, selection) {
    if (html === this.lastContent) return;
    this.lastContent = html;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.addEntry(html, selection);
    }, this.debounceDelay);
  }
  pushImmediate(html, selection) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (html !== this.lastContent) {
      this.lastContent = html;
      this.addEntry(html, selection);
    }
  }
  addEntry(html, selection) {
    this.stack = this.stack.slice(0, this.position + 1);
    this.stack.push({
      html,
      selection,
      timestamp: Date.now()
    });
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.position++;
    }
  }
  undo() {
    if (!this.canUndo()) return null;
    this.position--;
    return this.stack[this.position];
  }
  redo() {
    if (!this.canRedo()) return null;
    this.position++;
    return this.stack[this.position];
  }
  canUndo() {
    return this.position > 0;
  }
  canRedo() {
    return this.position < this.stack.length - 1;
  }
  getCurrent() {
    if (this.position < 0 || this.position >= this.stack.length) {
      return null;
    }
    return this.stack[this.position];
  }
  clear() {
    this.stack = [];
    this.position = -1;
    this.lastContent = "";
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
  getStackSize() {
    return this.stack.length;
  }
  getPosition() {
    return this.position;
  }
};

// src/commands.ts
var coreCommands = {
  // Text formatting
  bold: (editor) => {
    editor.getDocument().execCommand("bold", false);
  },
  italic: (editor) => {
    editor.getDocument().execCommand("italic", false);
  },
  underline: (editor) => {
    editor.getDocument().execCommand("underline", false);
  },
  strike: (editor) => {
    editor.getDocument().execCommand("strikeThrough", false);
  },
  subscript: (editor) => {
    editor.getDocument().execCommand("subscript", false);
  },
  superscript: (editor) => {
    editor.getDocument().execCommand("superscript", false);
  },
  code: (editor) => {
    const selection = editor.getSelection();
    if (!selection || selection.collapsed) return;
    const doc = editor.getDocument();
    const range = selection.range;
    if (!range) return;
    if (selection.formats.code) {
      const code = findParentTag(range.commonAncestorContainer, "code");
      if (code) {
        const parent = code.parentNode;
        while (code.firstChild) {
          parent?.insertBefore(code.firstChild, code);
        }
        code.remove();
      }
    } else {
      const codeEl = doc.createElement("code");
      codeEl.appendChild(range.extractContents());
      range.insertNode(codeEl);
    }
  },
  // Clear formatting
  clearFormat: (editor) => {
    editor.getDocument().execCommand("removeFormat", false);
  },
  // Block formatting
  heading: (editor, level) => {
    const tag = level ? `h${level}` : "p";
    editor.getDocument().execCommand("formatBlock", false, tag);
  },
  paragraph: (editor) => {
    editor.getDocument().execCommand("formatBlock", false, "p");
  },
  blockquote: (editor) => {
    const selection = editor.getSelection();
    if (selection?.formats.blockquote) {
      editor.getDocument().execCommand("formatBlock", false, "p");
    } else {
      editor.getDocument().execCommand("formatBlock", false, "blockquote");
    }
  },
  codeBlock: (editor) => {
    editor.getDocument().execCommand("formatBlock", false, "pre");
  },
  // Lists
  orderedList: (editor) => {
    editor.getDocument().execCommand("insertOrderedList", false);
  },
  unorderedList: (editor) => {
    editor.getDocument().execCommand("insertUnorderedList", false);
  },
  // Alignment
  alignLeft: (editor) => {
    editor.getDocument().execCommand("justifyLeft", false);
  },
  alignCenter: (editor) => {
    editor.getDocument().execCommand("justifyCenter", false);
  },
  alignRight: (editor) => {
    editor.getDocument().execCommand("justifyRight", false);
  },
  alignJustify: (editor) => {
    editor.getDocument().execCommand("justifyFull", false);
  },
  // Indentation
  indent: (editor) => {
    editor.getDocument().execCommand("indent", false);
  },
  outdent: (editor) => {
    editor.getDocument().execCommand("outdent", false);
  },
  // Links
  link: (editor, url) => {
    if (typeof url !== "string") return;
    const selection = editor.getSelection();
    if (!selection) return;
    if (selection.formats.link) {
      const range = selection.range;
      if (!range) return;
      const anchor = findParentTag(range.commonAncestorContainer, "a");
      if (anchor) {
        anchor.href = url;
      }
    } else if (!selection.collapsed) {
      editor.getDocument().execCommand("createLink", false, url);
    }
  },
  unlink: (editor) => {
    editor.getDocument().execCommand("unlink", false);
  },
  // Insert
  insertHR: (editor) => {
    editor.getDocument().execCommand("insertHorizontalRule", false);
  },
  insertHTML: (editor, html) => {
    if (typeof html !== "string") return;
    editor.getDocument().execCommand("insertHTML", false, html);
  },
  insertText: (editor, text) => {
    if (typeof text !== "string") return;
    editor.getDocument().execCommand("insertText", false, text);
  },
  // Selection
  selectAll: (editor) => {
    editor.getDocument().execCommand("selectAll", false);
  },
  // History
  undo: (editor) => {
    editor.emit("undo");
  },
  redo: (editor) => {
    editor.emit("redo");
  },
  // Font styling
  setFontSize: (editor, size) => {
    if (typeof size !== "string" && typeof size !== "number") return;
    const selection = editor.getSelection();
    if (!selection || selection.collapsed) return;
    const doc = editor.getDocument();
    const range = selection.range;
    if (!range) return;
    const span = doc.createElement("span");
    span.style.fontSize = typeof size === "number" ? `${size}px` : size;
    span.appendChild(range.extractContents());
    range.insertNode(span);
  },
  setFontFamily: (editor, font) => {
    if (typeof font !== "string") return;
    editor.getDocument().execCommand("fontName", false, font);
  },
  setColor: (editor, color) => {
    if (typeof color !== "string") return;
    editor.getDocument().execCommand("foreColor", false, color);
  },
  setBackgroundColor: (editor, color) => {
    if (typeof color !== "string") return;
    editor.getDocument().execCommand("hiliteColor", false, color);
  }
};
function findParentTag(node, tagName) {
  let current = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() === tagName.toLowerCase()) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}
var defaultShortcuts = [
  { key: "b", ctrl: true, command: "bold" },
  { key: "i", ctrl: true, command: "italic" },
  { key: "u", ctrl: true, command: "underline" },
  { key: "z", ctrl: true, command: "undo" },
  { key: "z", ctrl: true, shift: true, command: "redo" },
  { key: "y", ctrl: true, command: "redo" },
  { key: "\\", ctrl: true, command: "clearFormat" },
  { key: "k", ctrl: true, command: "link" }
];

// src/core.ts
function createEditor(config) {
  const targetEl = typeof config.target === "string" ? document.querySelector(config.target) : config.target;
  if (!targetEl) {
    throw new Error("Scribe: Target element not found");
  }
  const doc = config.iframe?.contentDocument || targetEl.ownerDocument;
  if (!doc) {
    throw new Error("Scribe: Could not access document");
  }
  const selectionManager = new SelectionManager(doc, targetEl);
  const sanitizer = new HTMLSanitizer(config.sanitize);
  const historyManager = new HistoryManager();
  let isDestroyed = false;
  let readOnly = config.readOnly ?? false;
  const plugins = /* @__PURE__ */ new Map();
  const commands = /* @__PURE__ */ new Map();
  const shortcuts = [...defaultShortcuts];
  const eventHandlers = /* @__PURE__ */ new Map();
  const contentEl = targetEl;
  if (!readOnly) {
    contentEl.contentEditable = "true";
  }
  contentEl.classList.add("scribe-editor", "scribe-content");
  if (config.placeholder) {
    contentEl.setAttribute("data-placeholder", config.placeholder);
  }
  Object.entries(coreCommands).forEach(([name, handler]) => {
    commands.set(name, handler);
  });
  const executeCommand = (command, ...args) => {
    if (readOnly) return;
    const handler = commands.get(command);
    if (handler) {
      handler(editor, ...args);
      historyManager.push(contentEl.innerHTML, null);
      editor.emit("change", contentEl.innerHTML);
      config.onChange?.(contentEl.innerHTML);
      requestAnimationFrame(() => {
        editor.emit("selectionChange", selectionManager.getSelection());
      });
    }
  };
  const editor = {
    // Core accessors
    getDocument: () => doc,
    getContentElement: () => contentEl,
    getSelection: () => selectionManager.getSelection(),
    // Command execution (still available for plugins)
    exec: (command, ...args) => executeCommand(command, ...args),
    canExec: (command) => commands.has(command) && !readOnly,
    // === Direct formatting methods (no exec needed) ===
    bold: () => executeCommand("bold"),
    italic: () => executeCommand("italic"),
    underline: () => executeCommand("underline"),
    strike: () => executeCommand("strike"),
    code: () => executeCommand("code"),
    subscript: () => executeCommand("subscript"),
    superscript: () => executeCommand("superscript"),
    clearFormat: () => executeCommand("clearFormat"),
    // Block formatting
    heading: (level) => executeCommand("heading", level),
    paragraph: () => executeCommand("paragraph"),
    blockquote: () => executeCommand("blockquote"),
    codeBlock: () => executeCommand("codeBlock"),
    // Lists
    orderedList: () => executeCommand("orderedList"),
    unorderedList: () => executeCommand("unorderedList"),
    // Alignment
    alignLeft: () => executeCommand("alignLeft"),
    alignCenter: () => executeCommand("alignCenter"),
    alignRight: () => executeCommand("alignRight"),
    alignJustify: () => executeCommand("alignJustify"),
    indent: () => executeCommand("indent"),
    outdent: () => executeCommand("outdent"),
    // Links
    link: (url) => executeCommand("link", url),
    unlink: () => executeCommand("unlink"),
    // Insert
    insertHR: () => executeCommand("insertHR"),
    insertHTML: (html) => executeCommand("insertHTML", html),
    insertText: (text) => executeCommand("insertText", text),
    // Styling
    setFontSize: (size) => executeCommand("setFontSize", size),
    setFontFamily: (font) => executeCommand("setFontFamily", font),
    setColor: (color) => executeCommand("setColor", color),
    setBackgroundColor: (color) => executeCommand("setBackgroundColor", color),
    // History
    undo: () => editor.emit("undo"),
    redo: () => editor.emit("redo"),
    // Content methods
    getHTML: () => contentEl.innerHTML,
    setHTML: (html) => {
      const sanitized = sanitizer.sanitize(html);
      contentEl.innerHTML = sanitized;
      historyManager.pushImmediate(sanitized, null);
      editor.emit("change", sanitized);
    },
    getText: () => contentEl.textContent || "",
    isEmpty: () => {
      const text = contentEl.textContent?.trim() || "";
      return text === "" && contentEl.children.length <= 1;
    },
    // Selection methods
    saveSelection: () => selectionManager.saveSelection(),
    restoreSelection: () => selectionManager.restoreSelection(),
    focus: () => {
      contentEl.focus();
      selectionManager.restoreSelection();
    },
    blur: () => contentEl.blur(),
    // Plugin access
    getPlugin: (name) => plugins.get(name),
    // State
    isReadOnly: () => readOnly,
    setReadOnly: (value) => {
      readOnly = value;
      contentEl.contentEditable = value ? "false" : "true";
      editor.emit("readOnlyChange", value);
    },
    // Event emitter
    on: (event, handler) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, /* @__PURE__ */ new Set());
      }
      eventHandlers.get(event).add(handler);
    },
    off: (event, handler) => {
      eventHandlers.get(event)?.delete(handler);
    },
    emit: (event, ...args) => {
      eventHandlers.get(event)?.forEach((handler) => handler(...args));
    },
    // Destroy
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      plugins.forEach((plugin) => plugin.destroy?.());
      plugins.clear();
      contentEl.removeEventListener("input", handleInput);
      contentEl.removeEventListener("keydown", handleKeyDown);
      contentEl.removeEventListener("paste", handlePaste);
      contentEl.removeEventListener("focus", handleFocus);
      contentEl.removeEventListener("blur", handleBlur);
      doc.removeEventListener("selectionchange", handleSelectionChange);
      contentEl.contentEditable = "false";
      contentEl.classList.remove("scribe-editor", "scribe-content");
      contentEl.removeAttribute("data-placeholder");
      eventHandlers.clear();
      historyManager.clear();
      editor.emit("destroy");
    }
  };
  const handleInput = () => {
    if (readOnly) return;
    historyManager.push(contentEl.innerHTML, null);
    editor.emit("change", contentEl.innerHTML);
    config.onChange?.(contentEl.innerHTML);
  };
  const handleKeyDown = (e) => {
    if (readOnly) return;
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        executeCommand(shortcut.command, ...shortcut.args || []);
        return;
      }
    }
  };
  const handlePaste = (e) => {
    if (readOnly) return;
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html");
    const text = e.clipboardData?.getData("text/plain");
    if (html) {
      const sanitized = sanitizer.sanitizePaste(html);
      executeCommand("insertHTML", sanitized);
    } else if (text) {
      executeCommand("insertText", text);
    }
  };
  const handleFocus = () => {
    editor.emit("focus");
    config.onFocus?.();
  };
  const handleBlur = () => {
    editor.emit("blur");
    config.onBlur?.();
  };
  const handleSelectionChange = () => {
    if (!selectionManager.isSelectionInContent()) return;
    const selection = selectionManager.getSelection();
    editor.emit("selectionChange", selection);
    config.onSelectionChange?.(selection);
  };
  editor.on("undo", () => {
    const entry = historyManager.undo();
    if (entry) {
      contentEl.innerHTML = entry.html;
      editor.emit("change", entry.html);
    }
  });
  editor.on("redo", () => {
    const entry = historyManager.redo();
    if (entry) {
      contentEl.innerHTML = entry.html;
      editor.emit("change", entry.html);
    }
  });
  contentEl.addEventListener("input", handleInput);
  contentEl.addEventListener("keydown", handleKeyDown);
  contentEl.addEventListener("paste", handlePaste);
  contentEl.addEventListener("focus", handleFocus);
  contentEl.addEventListener("blur", handleBlur);
  doc.addEventListener("selectionchange", handleSelectionChange);
  config.plugins?.forEach((plugin) => {
    plugins.set(plugin.name, plugin);
    if (plugin.commands) {
      Object.entries(plugin.commands).forEach(([name, handler]) => {
        commands.set(name, handler);
      });
    }
    if (plugin.shortcuts) {
      shortcuts.push(...plugin.shortcuts);
    }
    plugin.init?.(editor);
  });
  historyManager.pushImmediate(contentEl.innerHTML, null);
  if (config.autofocus) {
    setTimeout(() => editor.focus(), 0);
  }
  editor.emit("ready");
  return editor;
}
function init(selector, options = {}) {
  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`Scribe: Element "${selector}" not found`);
  }
  return createEditor({
    target,
    mode: "inline",
    ...options
  });
}
var Scribe = {
  init,
  createEditor
};

// src/plugins/index.ts
var boldPlugin = {
  name: "bold",
  toolbarItems: [{
    name: "bold",
    icon: "bold",
    title: "Bold (Ctrl+B)",
    command: "bold",
    isActive: (state) => state.bold,
    group: "format"
  }]
};
var italicPlugin = {
  name: "italic",
  toolbarItems: [{
    name: "italic",
    icon: "italic",
    title: "Italic (Ctrl+I)",
    command: "italic",
    isActive: (state) => state.italic,
    group: "format"
  }]
};
var underlinePlugin = {
  name: "underline",
  toolbarItems: [{
    name: "underline",
    icon: "underline",
    title: "Underline (Ctrl+U)",
    command: "underline",
    isActive: (state) => state.underline,
    group: "format"
  }]
};
var strikePlugin = {
  name: "strike",
  toolbarItems: [{
    name: "strike",
    icon: "strikethrough",
    title: "Strikethrough",
    command: "strike",
    isActive: (state) => state.strike,
    group: "format"
  }]
};
var codePlugin = {
  name: "code",
  toolbarItems: [{
    name: "code",
    icon: "code",
    title: "Inline Code",
    command: "code",
    isActive: (state) => state.code,
    group: "format"
  }]
};
var headingPlugin = {
  name: "heading",
  toolbarItems: [
    {
      name: "h1",
      icon: "heading1",
      title: "Heading 1",
      command: "heading",
      args: [1],
      isActive: (state) => state.heading === 1,
      group: "block"
    },
    {
      name: "h2",
      icon: "heading2",
      title: "Heading 2",
      command: "heading",
      args: [2],
      isActive: (state) => state.heading === 2,
      group: "block"
    },
    {
      name: "h3",
      icon: "heading3",
      title: "Heading 3",
      command: "heading",
      args: [3],
      isActive: (state) => state.heading === 3,
      group: "block"
    }
  ]
};
var listPlugin = {
  name: "list",
  toolbarItems: [
    {
      name: "unorderedList",
      icon: "list",
      title: "Bullet List",
      command: "unorderedList",
      isActive: (state) => state.list === "unordered",
      group: "list"
    },
    {
      name: "orderedList",
      icon: "listOrdered",
      title: "Numbered List",
      command: "orderedList",
      isActive: (state) => state.list === "ordered",
      group: "list"
    }
  ]
};
var blockquotePlugin = {
  name: "blockquote",
  toolbarItems: [{
    name: "blockquote",
    icon: "quote",
    title: "Quote",
    command: "blockquote",
    isActive: (state) => state.blockquote,
    group: "block"
  }]
};
var linkPlugin = {
  name: "link",
  toolbarItems: [{
    name: "link",
    icon: "link",
    title: "Link (Ctrl+K)",
    command: "showLinkModal",
    isActive: (state) => !!state.link,
    group: "insert"
  }]
};
var alignmentPlugin = {
  name: "alignment",
  toolbarItems: [
    {
      name: "alignLeft",
      icon: "alignLeft",
      title: "Align Left",
      command: "alignLeft",
      isActive: (state) => state.align === "left",
      group: "align"
    },
    {
      name: "alignCenter",
      icon: "alignCenter",
      title: "Align Center",
      command: "alignCenter",
      isActive: (state) => state.align === "center",
      group: "align"
    },
    {
      name: "alignRight",
      icon: "alignRight",
      title: "Align Right",
      command: "alignRight",
      isActive: (state) => state.align === "right",
      group: "align"
    }
  ]
};
var clearFormatPlugin = {
  name: "clearFormat",
  toolbarItems: [{
    name: "clearFormat",
    icon: "removeFormatting",
    title: "Clear Formatting (Ctrl+\\)",
    command: "clearFormat",
    group: "misc"
  }]
};
var historyPlugin = {
  name: "history",
  toolbarItems: [
    {
      name: "undo",
      icon: "undo",
      title: "Undo (Ctrl+Z)",
      command: "undo",
      group: "history"
    },
    {
      name: "redo",
      icon: "redo",
      title: "Redo (Ctrl+Shift+Z)",
      command: "redo",
      group: "history"
    }
  ]
};
var defaultPlugins = [
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
  historyPlugin
];
export {
  HTMLSanitizer,
  HistoryManager,
  Scribe,
  SelectionManager,
  coreCommands,
  createEditor,
  defaultPlugins,
  defaultShortcuts,
  init
};
