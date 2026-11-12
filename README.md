# Tsapo

Tsapo is an independently maintained parcel delivery application built with React, TanStack Start, Vite and TypeScript.

## Local development

Use Node.js 20.19+ or 22.12+ and npm.

```sh
git clone https://github.com/tawananyashachipata-lab/tsapo-project.git
cd tsapo-project
npm install
npm run dev
```

## Build and tests

```sh
npm run build
npm run test
npm run lint
```

## Deployment

Deploy to a Node.js-compatible host with `npm install` and `npm run build`. TanStack Start needs a server runtime, not static-only hosting. Set any backend environment variables in the hosting provider.

The Vite/TanStack Start plugin chain is configured directly in `vite.config.ts`; the project does not require a proprietary editor or its build plugin.
