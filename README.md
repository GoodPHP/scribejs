# Scribe Editor

<p align="center">
  <img src="https://scribejs.top/docs/screenshots/image1.png" alt="Scribe Editor hero preview" width="700" />
</p>

Lightweight rich-text editor core with a modern demo UI, fixed toolbar workflow, and a minimal API.

Website: https://scribejs.top

## What's new in v1.0.1

### Cross-browser toolbar fixes

Toolbar state (bold / italic / underline / strike / etc.) is now **identical across Chrome, Firefox, and Safari**.

#### Selection handling
- Normalized selection layer abstracts `window.getSelection()` and `Range` differences.
- Handles collapsed, backward, multi-node, and text-vs-element selections uniformly.
- Full iframe editing context support via `ownerDocument.defaultView`.

#### Toolbar state detection
- No longer relies on deprecated `document.queryCommandState` / `queryCommandValue`.
- Walks the DOM tree from the selection range, inspecting parent nodes for active marks (`<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<strike>`, `<code>`, `<a>`, `<blockquote>`, `<ol>`, `<ul>`, headings).
- Alignment detected via `getComputedStyle` with cross-window safety.

#### Safari fixes
- Selection saved before every toolbar click and restored after action.
- Prevents selection reset that Safari applies on button focus.

#### Firefox fixes
- `selectionchange` timing gaps handled via multi-event pipeline (`formatChange`, `change`, `focus`, `blur`).
- Mutation-safe selection refresh on every DOM change.

#### Polling safety net
- 100 ms interval while editor is focused force-refreshes `FormatState` from `SelectionManager`.
- JSON-diff guard ensures React only re-renders when state actually changes.
- Interval stops on blur and cleans up on unmount.

#### Event model
- Supports `selectionchange`, `beforeinput`, `input`, `keyup`, `mouseup`.
- `formatChange` event emitted synchronously after every command execution and DOM normalization.

### Command registry
- All toolbar items driven by `CommandMeta` — icon, label, shortcut, group, `active()` function.
- Fixed and floating toolbars share the same metadata; no duplicated logic.

### DOM normalizer (5-phase pipeline)
1. Structural cleanup (empty nodes, whitespace)
2. Inline mark merging (adjacent `<b><b>` → single `<b>`)
3. Block-level normalization
4. List structure repair
5. Final whitespace pass


## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Download](#download)
- [Usage](#usage)
- [Development](#development)
- [Documentation](#documentation)
- [API](#api)
- [Plugins](#plugins)
- [Support](#support)
- [License](#license)

## Features

- Inline-first editing with a fixed toolbar experience.
- Simple, typed API with direct method calls.
- Built-in HTML sanitization and safe paste handling.
- Extensible plugin architecture.
- Framework-agnostic core for integration anywhere.

## Screenshots

| API | Inline Toolbar | Fixed Editor |
| --- | --- | --- |
| ![API preview](https://scribejs.top/docs/screenshots/image2.png) | ![Inline toolbar demo](https://scribejs.top/docs/screenshots/image3.png) | ![Fixed editor](https://scribejs.top/docs/screenshots/image4.png) |

## Download

- NPM: `npm i scribejs-editor`
- CDN: `https://unpkg.com/scribejs-editor`
- Git: `git clone https://github.com/GoodPHP/scribejs`

## Usage

```ts
import { createEditor } from 'scribejs-editor';

const editor = createEditor({
  target: '#editor',
  placeholder: 'Start typing...'
});

editor.bold();
editor.link('https://example.com');

const html = editor.getHTML();
```

### React wrapper

```tsx
import { ScribeEditor, type ScribeEditorRef } from './components/scribe';
import { useRef } from 'react';

function App() {
  const editorRef = useRef<ScribeEditorRef>(null);

  return (
    <ScribeEditor
      ref={editorRef}
      toolbar="fixed"
      placeholder="Write something..."
      onChange={(html) => console.log(html)}
    />
  );
}
```

## Development

```bash
npm install
npm run dev
```

When the dev server starts, it prints the local URL to open the demo.

## Documentation

- Demo UI: index.html + public/demo.css + public/demo.js
- Build output: dist/index.js (browser ESM)
- Types: types/index.d.ts
- Source: src/

## API

Common editor methods used in the demo:

- `editor.bold()` / `editor.italic()` / `editor.underline()`
- `editor.heading(1 | 2 | 3)` / `editor.paragraph()` / `editor.blockquote()`
- `editor.orderedList()` / `editor.unorderedList()`
- `editor.link(url)` / `editor.unlink()`
- `editor.setFontSize(size)` / `editor.setFontFamily(family)`
- `editor.setColor(color)` / `editor.setBackgroundColor(color)`
- `editor.getHTML()` / `editor.getText()` / `editor.isEmpty()`

## Plugins

Scribe is built with a plugin-first architecture. Add only what you need and keep bundles lean.

- Built-in plugins live in src/plugins/
- External plugins can wrap common behaviors (toolbars, history, selection helpers)

## Support

If you use Scribe in production, consider sharing feedback or contributing improvements.

## License

BSD-3-Clause
