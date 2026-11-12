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

**Requirements:** Node.js 20.19+ or 22.12+, npm (or Bun), and access to the backend configured for the application.

```sh
git clone https://github.com/tawananyashachipata-lab/tsapo-project.git
cd tsapo-project
npm install
npm run dev
```

Open the local address printed in the terminal.

### Environment configuration

The current source code still uses Supabase for authentication, parcel data and assistant conversations. Configure the required Supabase project URL and publishable key in a local `.env` file using the variable names expected by `src/integrations/supabase/client`. Do not commit private credentials. Existing values may refer to an old hosted project; verify they belong to a backend you control.

If you want to replace Supabase, the authentication, database access and server routes must be migrated before deleting those integrations.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |

### Deploy

Tsapo uses TanStack Start with server-side routes, so deploy it to a hosting environment that supports the generated server runtime. Configure backend environment variables in the hosting provider and use `npm run build`. Check deployment logs and test sign-in, booking, tracking and assistant functionality after deploying.

## Project structure

- `src/routes/` — application pages and server routes
- `src/components/` — interface components
- `src/integrations/supabase/` — current Supabase client integration
- `drizzle/` — database-related files
- `public/favicon.svg` — Tsapo parcel favicon
- `vite.config.ts` — standalone Vite and TanStack Start configuration

This project is maintained directly in GitHub and does not need Lovable for development.
