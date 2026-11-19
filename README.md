# iDEAL Care Frontend

## Architecture

This frontend uses a layer-based structure that matches the existing application: DTOs and contract types live in `src/types`, backend services in `src/api`, shared infrastructure in `src/lib`, Zustand state in `src/stores`, route guards in `src/routes`, and screens in `src/pages`. This keeps authentication and tenant context in one place without reorganizing unrelated feature modules.

Authentication uses the single Axios client in `src/lib/apiClient.ts`. The API base URL is configured with `VITE_API_BASE_URL`; copy `.env.example` to `.env.local` for local values. Login sends the current hostname as `domain`, with `VITE_DEV_TENANT_DOMAIN` available only in Vite development mode.

Production builds default to `https://care.api.idealsmartsolutions.com` via `.env.production`. Vite embeds this setting at build time; hosting environment variables and `.env.local` can override it, so rebuild and redeploy after changing it.

For Vercel deployments, set the project root to this application so that `vercel.json` serves the React app for direct visits and refreshes on routes such as `/login`. Check that any Vercel `VITE_API_BASE_URL` override points to the production backend origin and that the backend allows the web app's origin through CORS. Redeploy after changing the configuration.

The app follows the backend's one-tenant contract. Runtime context is represented by `tenant.tenant_id` and `tenant.tenant_role`, preserving the exact JWT claim names. The client uses these values for display and UX only; authorization remains server-enforced. Only the access token and expiry are persisted through `authStorage`.

`ProtectedRoute` keeps protected content out of the render tree while auth is initializing or loading, redirects unauthenticated users to `/login`, and preserves the attempted location in router state. The Axios response interceptor centrally handles non-login 401 responses by clearing auth and navigating to login; 403 responses pass through unchanged.

## Commands

```bash
npm run dev
npm test
npm run lint
npm run build
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
