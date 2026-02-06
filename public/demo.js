import { createEditor } from '/dist/index.js';

const fixedEditor = createEditor({
  target: '#editor-fixed',
  placeholder: 'Start typing...'
});

const setupToolbar = (toolbar, editor) => {
  if (!toolbar) return;

  const applyCommand = (cmd, arg) => {
    if (typeof editor[cmd] === 'function') {
      if (arg !== undefined) {
        editor[cmd](arg);
      } else {
        editor[cmd]();
      }
    }
  };

  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const cmd = button.dataset.cmd;
    const arg = button.dataset.arg;

    if (!cmd) return;

    if (cmd === 'link') {
      const url = window.prompt('Enter URL');
      if (url) editor.link(url);
      return;
    }

    if (cmd === 'insertHR') {
      editor.insertHR();
      return;
    }

    if (cmd === 'undo' || cmd === 'redo') {
      editor[cmd]();
      return;
    }

    applyCommand(cmd, arg ? Number(arg) : undefined);
  });

  const fontSize = toolbar.querySelector('[data-role="font-size"]');
  const fontFamily = toolbar.querySelector('[data-role="font-family"]');
  const textColor = toolbar.querySelector('[data-role="text-color"]');
  const bgColor = toolbar.querySelector('[data-role="bg-color"]');

  if (fontSize) {
    fontSize.addEventListener('change', () => editor.setFontSize(fontSize.value));
  }
  if (fontFamily) {
    fontFamily.addEventListener('change', () => editor.setFontFamily(fontFamily.value));
  }
  if (textColor) {
    textColor.addEventListener('change', () => editor.setColor(textColor.value));
  }
  if (bgColor) {
    bgColor.addEventListener('change', () => editor.setBackgroundColor(bgColor.value));
  }
};

const setupStatus = (editor, htmlOutput, textOutput, emptyState) => {
  const updateStatus = () => {
    if (htmlOutput) htmlOutput.textContent = editor.getHTML();
    if (textOutput) textOutput.textContent = editor.getText();
    if (emptyState) emptyState.textContent = `Empty: ${editor.isEmpty()}`;
  };

  editor.on('change', updateStatus);
  updateStatus();
};

const fixedToolbar = document.getElementById('toolbar-fixed');

setupToolbar(fixedToolbar, fixedEditor);

setupStatus(
  fixedEditor,
  document.getElementById('html-output-fixed'),
  document.getElementById('text-output-fixed'),
  document.getElementById('empty-state-fixed')
);

const sample = `
<h1>Welcome to Scribe</h1>
<p>Scribe is a <strong>production-ready</strong> rich text editor with a simple, intuitive API. Just call methods like <code>editor.bold()</code> — no complex commands to memorize.</p>
<h2>Key Features</h2>
<ul>
  <li><strong>Simple API</strong> — Direct methods like .bold(), .italic(), .link()</li>
  <li><strong>Inline-first editing</strong> — Edit content directly where it lives</li>
  <li><strong>Plugin architecture</strong> — Extend with modular plugins</li>
  <li><strong>XSS protection</strong> — Built-in HTML sanitization</li>
</ul>

<h2>Try It Out</h2>
<p>Select any text to see the toolbar in action. Try making text <strong>bold</strong>, <em>italic</em>, or add a <a href="https://example.com">link</a>.</p>
<blockquote>
  "The best interface is no interface at all." — Golden Krishna
</blockquote>

<p>Ready to build something amazing? Check out the <strong>docs</strong>! 🚀</p>
`;

const fixedSample = `
<p>This editor uses a fixed toolbar that's always visible. Great for longer editing sessions where you need quick access to all formatting options.</p>
<p>Try creating some <strong>formatted content</strong> using the toolbar above!</p>
`;

const fillButton = document.getElementById('btn-fill');
const clearButton = document.getElementById('btn-clear');
const vanillaSnippet = document.getElementById('code-snippet-vanilla');
const reactSnippet = document.getElementById('code-snippet-react');
const copyVanillaButton = document.getElementById('btn-copy-vanilla');
const copyReactButton = document.getElementById('btn-copy-react');

const vanillaExample = `import { createEditor } from 'scribe-editor';

const editor = createEditor({
  target: '#editor',
  placeholder: 'Start typing...'
});

editor.bold();
editor.link('https://example.com');

const html = editor.getHTML();`;

const reactExample = `import { useEffect, useRef } from 'react';
import { createEditor } from 'scribe-editor';

export function Editor() {
  const elRef = useRef(null);

  useEffect(() => {
    if (!elRef.current) return;
    const editor = createEditor({
      target: elRef.current,
      placeholder: 'Start typing...'
    });
    return () => editor.destroy?.();
  }, []);

  return <div ref={elRef} className="editor" />;
}`;

if (vanillaSnippet) {
  vanillaSnippet.textContent = vanillaExample;
}

if (reactSnippet) {
  reactSnippet.textContent = reactExample;
}

fixedEditor.setHTML(sample);

fillButton.addEventListener('click', () => fixedEditor.setHTML(sample));
clearButton.addEventListener('click', () => fixedEditor.setHTML(''));

if (copyVanillaButton) {
  copyVanillaButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(vanillaExample);
      copyVanillaButton.textContent = 'Copied!';
      setTimeout(() => {
        copyVanillaButton.textContent = 'Copy';
      }, 2000);
    } catch {
      copyVanillaButton.textContent = 'Copy failed';
      setTimeout(() => {
        copyVanillaButton.textContent = 'Copy';
      }, 2000);
    }
  });
}

if (copyReactButton) {
  copyReactButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reactExample);
      copyReactButton.textContent = 'Copied!';
      setTimeout(() => {
        copyReactButton.textContent = 'Copy';
      }, 2000);
    } catch {
      copyReactButton.textContent = 'Copy failed';
      setTimeout(() => {
        copyReactButton.textContent = 'Copy';
      }, 2000);
    }
  });
}

