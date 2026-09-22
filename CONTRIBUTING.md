# Contributing

This is a personal site. Corrections, bug reports, and small fixes are welcome.

## Setup

Bun is the package manager. There is a `bun.lock` and no `package-lock.json` — do not commit one.

```sh
bun install
bun dev
```

Copy `.env.example` to `.env` if you need the Supabase-backed multiplayer game locally. Everything else runs without it.

## Scripts

| Script | What it does |
| --- | --- |
| `bun dev` | Next dev server on http://localhost:3000 |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Bun test runner |
| `bun run lint` | Biome check (lint + format verification) |
| `bun run lint:fix` | Biome check with safe fixes applied |
| `bun run format` | Biome formatter, write mode |
| `bun run analyze` | Webpack build with the bundle analyzer report |
| `bun run train` | Retrain the four-in-a-row model |
| `bun run doctor` | react-doctor over the project |

## Linting and formatting

Biome is the only linter and formatter here. There is no ESLint and no Prettier. `bun run lint` is what CI
runs; `bun run lint:fix` fixes what is safely fixable. The config lives in `biome.json` and is tuned to the
existing style: 2-space indent, double quotes, semicolons, trailing commas, 120 columns.

## Commits

Conventional commits, enforced by commitlint on `commit-msg`. Allowed scopes: `blog`, `game`, `scenes`,
`seo`, `ui`, `deps`, `ci`, `content`. Header max length is 100.

```
fix(game): stop the eval panel from flickering on the first AI move
```

## Pull requests

Keep them small and say how you checked the change. Screenshots for anything visual, in both themes.
