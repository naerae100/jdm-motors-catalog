# Miami Motors — Engine Catalogue

B2B wholesale catalogue for **Miami Motors Used Auto Spare Parts Trading Co. LLC**, a Sharjah/UAE
exporter of used Japanese and Korean engines, half cuts, gearboxes and complete cars.

This is a browse-and-enquire catalogue, not a shop. No prices, no cart, no checkout — every
listing's call to action is a WhatsApp enquiry, and an AI sales agent answers buyers directly on
the site.

Live: <https://stockist.jdmmiamimotors.com>

## Running it

```bash
npm install
cp .env.example .env      # add your OPENAI_API_KEY
npm run dev               # http://localhost:8080
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run agent:test` | Sales agent checks, offline, no API key needed |
| `npm run agent:live` | Sales agent against the real model (costs a few cents) |

## Layout

```
src/data/listings.ts      292 listings, generated from jdm-images/catalog.csv by migrate.py
src/lib/catalogue.ts      Faceted search for the catalogue grid
src/lib/agent/            The AI sales agent (prompt, tools, price guard, inventory search)
src/components/agent/     Floating chat widget
src/routes/index.tsx      The catalogue page
src/server.ts             SSR entry; also routes POST /api/chat to the agent
```

## The sales agent

"Sami" answers buyers in the floating chat widget. The rules that matter:

- **Never quotes a price.** Escalates to the sales team and keeps chatting. Enforced twice — in
  the system prompt and by a regex guard on every outgoing message.
- **Minimum order is 5 units.** Single-unit buyers get upsold with 30% off shipping, not refused.
- **Searches live inventory before claiming stock.** It cannot invent an engine.
- **Replies in the buyer's language** — Spanish, Arabic, French and so on.

Policy numbers live in `src/lib/agent/policy.ts`. Change them there, not in the prompt.

Requires `OPENAI_API_KEY` as a server-side environment variable (set it in the hosting dashboard
for production; `.env` is local only and gitignored).

## Updating the inventory

Edit `jdm-images/catalog.csv`, then:

```bash
python3 migrate.py && npx prettier --write src/data/listings.ts
```

Images live in `public/images/inventory/<folder>/img_01.jpg`, matching the CSV's `folder` column.
