import { Scribe } from '/dist/index.js'; window.Scribe = Scribe;

const fixedEditor = Scribe.init('#editor-fixed', {
  placeholder: 'Write something amazing...'
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
<h1>Welcome to Scribe Editor</h1>
<p>This is a live demo of the Scribe editor. Select any text to see the toolbar!</p>

<p>Try making text <em>italic</em>, adding a <a href="https://example.com/">link</a>, or creating headings and lists.</p>

<ul>
  <li>Feature 1: Floating toolbar</li>
  <li>Feature 2: Direct API methods</li>
  <li>Feature 3: Built-in sanitization</li>
</ul>

<blockquote>
  Scribe is designed to be lightweight and easy to integrate.
</blockquote>
`;

const vanillaSnippet = document.getElementById('code-snippet-vanilla');
const reactSnippet = document.getElementById('code-snippet-react');
const copyVanillaButton = document.getElementById('btn-copy-vanilla');
const copyReactButton = document.getElementById('btn-copy-react');

const vanillaExample = `<!-- One-line initialization -->
<div id="editor">
  <p>Start editing...</p>
</div>

<script type="module">
  import { Scribe } from './scribe.js';
  
  const editor = Scribe.init('#editor');
  
  // Direct methods - no exec() needed
  editor.bold();
  editor.link('https://example.com');
</script>`;

const reactExample = `import { ScribeEditor, ScribeEditorRef } from '@/components/scribe';
import { useRef, useState } from 'react';

function BasicEditor() {
  const [content, setContent] = useState('<p>Hello world!</p>');
  
  return (
    <ScribeEditor
      defaultValue={content}
      placeholder="Start writing..."
      toolbar="floating"
      onChange={(html) => setContent(html)}
    />
  );
}`;

if (vanillaSnippet) {
  vanillaSnippet.textContent = vanillaExample;
}

if (reactSnippet) {
  reactSnippet.textContent = reactExample;
}

fixedEditor.setHTML(sample);

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

