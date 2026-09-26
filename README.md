# Personal Financial Intelligence System

A private, personal finance application for a single user. This is not a
SaaS product and not a simple expense tracker — the goal is to understand
one person's full financial picture: net worth, spendable money, savings
rate, goal progress, and (eventually) why the numbers are changing and
what happens under different what-if scenarios.

The full product vision, domain model, and business rules live in the
**Step 0 specification**, which is the authoritative source of truth for
this project. This README only describes the technical foundation.

## Project status: Step 1 — Project Foundation

This repository currently contains the **application shell and technical
foundation only**. No financial functionality is implemented yet:

- No transaction, asset, goal, budget, or wishlist logic
- No Financial Engine
- No Gemini/AI integration
- No final database schema

See [`docs/architecture.md`](./docs/architecture.md) for what Step 1
actually establishes.

## Key characteristics

- **Local-first** — data will be stored in the browser via IndexedDB
  (through Dexie). No required backend or cloud database.
- **Single-user** — no authentication, accounts, or multi-user concerns.
- **AI is optional** — the app must remain fully usable without Gemini.
  Gemini is a future, non-authoritative analysis layer on top of a
  deterministic Financial Engine, not a replacement for it.

## Tech stack

- React 19 + TypeScript (strict mode)
- Vite
- React Router (client-side routing)
- Dexie (IndexedDB abstraction — persistence boundary only, no schema yet)
- ESLint + Prettier
- Vitest + Testing Library

## Getting started

```bash
npm install
npm run dev
```

The app runs at the URL Vite prints (typically `http://localhost:5173`).
Dashboard is the default route.

## Available scripts

| Script                 | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite dev server                |
| `npm run build`        | Type-check and build for production      |
| `npm run preview`      | Preview the production build locally     |
| `npm run lint`         | Run ESLint                               |
| `npm run typecheck`    | Run TypeScript project-reference build   |
| `npm run test`         | Run the test suite once (Vitest)         |
| `npm run test:watch`   | Run tests in watch mode                  |
| `npm run format`       | Format the codebase with Prettier        |
| `npm run format:check` | Check formatting without writing changes |

## Project structure

```text
src/
  app/            Root App component, routes, layouts (header/sidebar shell)
  components/ui/  Reusable UI primitives (Button, Input, Card, Dialog, ...)
  features/       One folder per product area (dashboard, transactions, ...)
                  — currently placeholder pages only
  domain/         Future Financial Engine: entities, calculations, rules
                  — intentionally empty in Step 1
  data/
    db/           Dexie persistence boundary (no schema yet)
    repositories/ Future data-access layer — empty in Step 1
  services/ai/    Future optional Gemini integration — empty in Step 1
  lib/utils/      Small generic utilities
  types/          Shared, non-domain-specific types
  styles/         Design tokens and global CSS reset
```

See [`docs/architecture.md`](./docs/architecture.md) for the reasoning
behind these boundaries.

## Environment configuration

Copy `.env.example` to `.env` if/when you need local environment
variables. Nothing is required for Step 1. `.env` files are git-ignored;
never commit real secrets or API keys.

## Contributing to later steps

Do not add financial domain logic, a Dexie schema, or a Gemini
integration directly into this foundation without following the Step 0
specification. Those belong to their own implementation steps (Step 2
onward).
