# React + TypeScript + Vite

## Saving And Collaboration

The editor autosaves a project snapshot in this browser's IndexedDB. A snapshot contains the canvas size, Fabric.js scene (objects, positions, styles, and custom metadata), and editor settings. Image pixels and some effects are represented by the current image source; text, shapes, charts, and similar elements remain separate editable objects. This is local recovery, not cloud sync or an edit-by-edit history.

For a shared backend, save the editable project document as JSON and store original/current image assets separately in file or object storage. Put asset IDs or URLs in the document instead of repeatedly embedding large base64 images. Also save a project ID, revision/version, and updated time. Keep a rendered PNG/JPEG export as an optional preview or download, not as the only saved form: a flattened image cannot restore individual objects for editing.

When another person saves, the client can fetch the newer project revision and reload its scene to see their changes. For near-real-time updates, notify other clients through WebSockets or server-sent events, then fetch the latest revision. Use revision checks or locking to detect simultaneous edits; otherwise one person's full-snapshot save can overwrite the other's changes. True simultaneous editing needs operations/deltas with conflict resolution, rather than only replacing snapshots.

Conceptually, the saved scene looks like this:

```json
{
  "width": 1200,
  "height": 800,
  "scene": {
    "objects": [
      { "type": "image", "left": 0, "top": 0, "src": "asset-id-or-url" },
      { "type": "textbox", "text": "Title", "left": 80, "top": 60 },
      { "type": "image", "name": "Chart", "chartConfigJson": "...", "left": 300, "top": 180 }
    ]
  }
}
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
