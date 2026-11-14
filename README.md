# Tsapo — Parcel delivery across Zimbabwe

Tsapo helps people book, track and collect parcels between Zimbabwean towns using local agents. The app includes parcel bookings, tracking, agent information, user authentication and a Tsapo assistant.

## How to use Tsapo (sender or recipient)

1. **Open the website.** Choose **Send a parcel** to start a booking, or use **Track a parcel** on the homepage to follow an existing shipment.
2. **Create an account or sign in** when the booking flow requests authentication.
3. **Book a parcel.** Select the origin and destination, choose the parcel category, enter the weight, and complete the sender and recipient details. Review the quoted price and submission details before confirming.
4. **Drop off the parcel** with the selected Tsapo agent. Follow the instructions shown after booking.
5. **Track delivery.** Enter your tracking number (for example, `TSP-AB12-345678`) in the homepage tracking form.
6. **Collect securely.** The recipient presents the required pickup code when collecting the parcel from the agent.
7. **Ask Tsapo.** Use the **Ask Tsapo** button for parcel help. Chat history requires signing in and depends on the configured backend.

Some actions require a working backend and configured services. If booking, authentication or chat fails, check the deployment environment and server logs rather than assuming the transaction succeeded.

## How to use Tsapo (agent)

1. Select **Find an agent** from the homepage.
2. Review available agent information or the application option.
3. Follow the site's agent registration and handover workflow. Agent availability and approvals depend on the deployed backend.

## Developer setup

**Requirements:** Node.js 22.12+ or Bun, and the existing backend's public configuration.

```sh
git clone https://github.com/tawananyashachipata-lab/tsapo-project.git
cd tsapo-project
npm install
npm run dev
```

Open the local address printed in the terminal.

### Environment configuration

Tsapo remains connected to the existing Lovable Cloud backend by the owner's choice. It uses the Supabase client protocol for accounts, parcels, private storage and conversations. Do not create another project or replay the initial migrations on the existing database.

Copy `.env.example` to `.env` locally and fill in the existing backend's URL and publishable key. Configure both the `VITE_` browser variables and unprefixed server variables. Public keys are not administrator credentials; RLS and authenticated database functions authorize operations. Never place private service/API keys in a `VITE_` variable or commit them. Preserve the generated integration files while working in Lovable.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |

### Deploy

The source uses standalone Vite, TanStack Start and Nitro plugins, not a Lovable runtime/build package. Lovable's editor-only tagging/preview packages are not imported by the production configuration; the editor may automatically install them for its own preview.

#### GitHub and Vercel

1. Connect GitHub through Lovable's Project settings → Git, or use the existing repository outside Lovable. The agent cannot connect Git sync or a Vercel account for you.
2. Import the repository into Vercel and select Node.js 22. The included `vercel.json` uses Bun, the committed lockfile and Nitro's Vercel preset. Do not add SPA rewrites: the application has real server routes.
3. Set the public/browser and server backend variables from `.env.example` in Vercel for the same existing backend. No database is created during the application build.
4. Ensure the existing authentication service allows the final site's origin and `/reset-password` callback. Test a genuine confirmation/reset email on that domain; redirect settings are not established by source code alone.
5. Deploy and verify sign-in, a marked test booking, public tracking, role restrictions, private photo access, support and notifications. Vercel deployment has **not** been performed or verified from this editor.

#### Remaining managed-service limitations

- Keeping Lovable Cloud preserves the existing data; it does not make the backend independent of Lovable. An enabled Cloud connection cannot be disconnected here, and its service-role credentials cannot be exported.
- The existing AI endpoint uses a server-only Lovable AI key and privileged circuit-breaker access. Those managed credentials are not available for copying to Vercel. The current AI endpoint will fail safely without them; full AI portability remains blocked, not complete. Do not put a fabricated key into hosting settings.
- In-app shipment notifications are implemented; SMS/email shipment notifications are not integrated.
- EcoCash, OneMoney, bank transfer and cash-at-agent are recorded payment methods with real manual verification. No automatic payment settlement or fake payment success is implemented.
- For local Node hosting, set `NITRO_PRESET=node-server` and use the produced `dist/server` entry. In-editor production builds default to the Worker adapter and write `dist/`; Vercel builds use its own build-output adapter.

## Project structure

- `src/routes/` — application pages and server routes
- `src/components/` — interface components
- `src/integrations/supabase/` — current Supabase client integration
- `drizzle/` — database-related files
- `public/favicon.svg` — Tsapo parcel favicon
- `vite.config.ts` — standalone Vite and TanStack Start configuration

The source can be developed from GitHub; the selected existing backend and AI remain managed services. See `AUDIT.md` for verified outcomes and outstanding checks.
