# Working in this repository

## Always build before pushing

`npm run dev` is **not** enough. Dev and production chunk differently, and this stack
(Vite 8 / Nitro 3 beta / TanStack Start) has a live landmine described below that only
appears in a production build. Before any push:

```bash
npm run typecheck && npm run lint
NITRO_PRESET=node-server npx vite build
node .output/server/index.mjs          # then check / returns 200, not a 500 error page
```

## Landmine: do not add a `createServerFn`

Registering a server function pulls it into the SSR entry chunk. Past a size threshold the
bundler splits that chunk in two, and the split produces a circular import between the halves,
so TanStack's own top-level call in `start-server-core/createStartHandler.js` runs before its
import initialises:

```
TypeError: createCsrfMiddleware is not a function
```

Every server-rendered route then returns 500 while static assets keep serving, so the site
looks half-alive. This took production down once.

**Instead:** add a plain handler and route it from `src/server.ts` behind a `await import(...)`,
the way `POST /api/chat` reaches `src/lib/agent/http.ts`. The dynamic import is load-bearing —
a static one puts the module back in the entry graph and the bug returns.

To check you are clear, there must be exactly **one** `server-*.mjs`:

```bash
ls .output/server/_ssr/server-*.mjs
```

## Secrets

`.env` holds the real key and is gitignored. `.env.example` is committed and must stay blank.
Scan before committing:

```bash
grep -rn "sk-proj-\|sk-" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules
```

## Data

`src/data/listings.ts` is generated — edit `jdm-images/catalog.csv` and re-run `migrate.py`,
then Prettier. Hand edits are lost on the next run.
