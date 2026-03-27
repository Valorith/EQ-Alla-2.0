# EQ Alla 2.0

Modern EverQuest encyclopedia scaffold built as a monorepo around `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS v4`, and shared data/UI packages.

## What is implemented

- A runnable monorepo with `apps/web`, `packages/data`, and `packages/ui`
- Modern responsive catalog UI with clean routes for the major Alla sections
- Legacy route compatibility for the old `?a=` query model and `task.php` / `spawngroup.php`
- Internal API routes for search and entity listings
- Mock-backed read services that mirror the planned domain model
- MySQL connectivity and schema-capability health checks for an EQEmu-style mirror
- Redis-backed cache abstraction with in-memory fallback
- Docker, Caddy, Vitest, and Playwright scaffolding

## Current status

The app runs end-to-end with curated mock data by default so the UI and route model are testable immediately. The data package already includes the DB and capability plumbing needed to connect a mirrored EQEmu schema, but the detailed live SQL mappings for every entity family are still the next major step.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` and change values as needed.

Set `EQ_USE_MOCK_DATA=false` once the live MySQL mappings are ready to be used across the catalog.

