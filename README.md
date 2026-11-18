# React + TypeScript + Vite

## Real-Time Shared Canvases

The app retains its IndexedDB local draft recovery and adds optional shared documents. When Supabase is configured, uploading an image creates a UUID document, stores the unmodified original at `canvas-originals/<document-id>/original/<filename>`, and stores a Fabric.js scene in `canvas_documents`. Image object sources are externalized to Storage URLs, not embedded as base64 in JSONB. Opening a shared link (`?document=<uuid>`) fetches that row, loads the original asset and scene once, and joins the Socket.IO room for that document.

The start screen has an **Upload** tab and a **Workspace** tab. Workspace lists saved canvas documents as image-preview tiles with their name, Storage bucket/path, and last update time. Selecting a tile opens its existing canvas document and its latest saved edits; it does not create another copy. Use the refresh button to reload the library after adding images elsewhere.

Workspace records are fetched only when the user opens Workspace or requests a refresh, and each query is capped at the latest 100 documents. Creates and saves update the local list instead of refetching it. The list is cached in browser storage for temporary API failures. If the document API is unavailable, the picker can list a bounded number of originals from Storage and open one in a **live-only** room: connected guests can exchange object operations, but the UI explicitly marks those edits as not saved. Saved scenes and cross-refresh recovery require the database API to recover. New shared-document creation verifies the database before uploading assets, avoiding orphan Storage folders when document inserts cannot work. Derived image assets use a document-scoped SHA-256 path and non-overwriting uploads; unchanged image source data is cached per object, so moving an image does not hash or upload its pixels again. Existing identical assets are reused rather than overwritten.

Local Fabric add, modify, remove, and text-change events send one object-level operation to the relay. The relay forwards operations only to other clients in the matching room. Incoming operations are deduplicated and applied to one Fabric object; they do not reload the scene or trigger another broadcast. Only the client making a local edit schedules the debounced full-scene save. The SQL RPC checks the expected version atomically; on conflict, the client merges objects and deletion tombstones using timestamp/client-ID last-write-wins, then retries. This is not a CRDT: simultaneous edits to one object are last-write-wins, client clock skew can affect that choice, and full scene merges are best-effort.

### Setup

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY`. The existing root `.env` names `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` are also supported. Vite exposes only those specifically allowed public values; never add a service-role or secret key to a `VITE_` variable.
2. Apply `supabase/migrations/202611110001_canvas_documents.sql` and `supabase/migrations/202611120001_canvas_documents_updated_at_index.sql` to the Supabase project (for example, in the Supabase SQL editor). They create the table, public Storage bucket, prototype RLS policies, version-checking RPC, and the Workspace ordering index.
3. Configure `VITE_COLLAB_SERVER_URL` for the frontend and `COLLAB_PORT` / `COLLAB_ALLOWED_ORIGIN` for the relay as needed. In development the relay accepts loopback localhost ports (including Vite's fallback ports); in production, explicitly list allowed origins.
4. Start the relay and Vite in separate terminals with `npm run collab-server` and `npm run dev`.
5. Upload an image in a configured app, copy the shared link from the header, and open it in a second tab. The editor displays save state, WebSocket status, and connected guest-client count. Use **Open shared document** from the upload screen to enter an existing document ID.

The SQL policies intentionally allow unrestricted anonymous access to every document and asset so this prototype works without auth. Guest IDs are temporary session IDs, not user identities. Do not deploy this policy unchanged: add authentication, document-level authorization, private Storage access, rate limits, operation validation, and server-side authorization before production. Socket.IO is a relay, not a trusted persistence layer; Supabase is the only permanent shared storage. Disconnected clients rejoin their room and fetch the newest saved scene while retaining local dirty changes.

### Collaboration Modules

- `src/features/editor/collaboration/supabaseClient.ts` initializes the public-key Supabase client.
- `canvasStorageService.ts` uploads the immutable original, content-addressed derived image assets, and resolves public URLs.
- `canvasDocumentService.ts` creates, opens, and version-saves `canvas_documents` records.
- `socketClient.ts` maintains one reconnecting client and a temporary guest ID; `canvasRealtimeService.ts` defines room and operation events; `types.ts` supplies the Supabase JSON type.
- `useCanvasCollaboration.ts` connects Fabric events, remote object application, conflict merging, reconnect restoration, active-user and save state.
- `src/styles/editor/collaboration.css` styles the added connection, presence, and loading indicators without changing the existing editor layout.
- `backend/server.js`, `backend/socket/socketHandlers.js`, and `roomManager.js` run the separate room-based relay. `socketHandlers.test.js` tests room isolation, deduplication, and disconnect presence.
- `supabase/migrations/202611110001_canvas_documents.sql` defines the storage/database schema and atomic version-check RPC.
- `supabase/migrations/202611120001_canvas_documents_updated_at_index.sql` indexes document recency for Workspace listing.

Run the relay smoke test with `npm run test:collab`. The existing `npm run build` checks the React/Fabric integration. A full two-browser Supabase workflow requires a configured Supabase project and the SQL migration above.

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
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
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
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
