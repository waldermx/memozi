# MemoZi

Open-source app for learning to write Chinese characters (HSK 1–3), with FSRS spaced repetition,
stroke-order practice and gamification. Runs on the web as a PWA and as an Android app (Capacitor)
from a single React codebase.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React, Ionic, Capacitor (Android), Zustand, TanStack Query, hanzi-writer |
| Backend | Fastify, TypeScript, Prisma, PostgreSQL, Redis, JWT + refresh-token rotation, OAuth2 |
| Scheduling | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) |
| Infra | Docker Compose, Traefik, GitHub Container Registry, Prometheus + Grafana |

## Architecture

pnpm monorepo with three packages: `backend`, `frontend` and `shared` (types used by both).

The backend follows a hexagonal (ports & adapters) layout:

```
backend/src/
  domain/          entities, domain services (FSRS, gamification), outbound ports
  application/     one use case per file (LoginUser, GetDueCards, SubmitBinaryReview…)
  infrastructure/  Fastify routes, Prisma repositories
```

Domain services have no framework dependencies and are unit-tested in isolation
(`FSRSService.test.ts`, `GamificationService.test.ts`).

## CI/CD

| Workflow | What it does |
|---|---|
| `ci.yml` | lint, typecheck and tests on every push |
| `licenses.yml` | checks every npm dependency license against `licenses.allow.json` |
| `cd-staging.yml` | builds API and frontend images, pushes to GHCR, deploys over SSH, runs `prisma migrate deploy` |
| `cd-production.yml` | same flow, manual trigger, with a smoke test |
| `android-apk.yml` | builds a debug APK with Capacitor + Gradle and uploads it as an artifact |

Commits follow Conventional Commits, enforced with husky + commitlint; lint-staged runs ESLint and
Prettier before each commit.

## Running locally

```bash
pnpm install
docker compose up -d        # postgres, redis, adminer, prometheus, grafana
pnpm dev                    # api + frontend in parallel
```

Copy `backend/.env.example` to `backend/.env` first.

## Contributing & licensing

Contributions are welcome. Before your first pull request is merged you need to accept the
[Contributor License Agreement](CLA.md): a bot comments on the pull request and you reply to
accept it once. You keep the copyright in your work; the agreement lets the project owner also
license it under other terms (MemoZi is open core), and it stays available under the project's open
source license.

New dependencies must pass the license check (`pnpm licenses:check`, policy in
[`licenses.allow.json`](licenses.allow.json)). After changing production dependencies, run
`pnpm licenses:notices` to refresh [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## License

- **Code**: [GNU Affero General Public License v3.0 or later](LICENSE) (`AGPL-3.0-or-later`).
- **Vocabulary data** in [`data/`](data/): [CC BY-SA 4.0](data/LICENSE), because it is derived
  from CC-CEDICT and other sources credited in [`data/NOTICE.md`](data/NOTICE.md).
- **Third-party components**: npm dependencies, and data and fonts that will be bundled, keep their
  own licenses. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Status

- The last production deploy runs (June 2026) failed; CI is green.
- Prometheus and Grafana are provisioned, but the API does not expose a metrics endpoint yet.
