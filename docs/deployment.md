# Deployment

## Move this project to its own GitHub repository

The session that built HARSI could update `AmiraliEsi83/Test` but could not create a new repository (`Resource not accessible by integration`).

From a machine where you are logged in as `AmiraliEsi83`:

```bash
gh repo create AmiraliEsi83/harsi-ai-trading --public --description "HARSI research terminal"
git remote add harsi https://github.com/AmiraliEsi83/harsi-ai-trading.git
git push harsi HEAD:main
```

Do not deploy this app to `https://AmiraliEsi83.github.io/Test`. It needs a server and a database.

## Run with Docker

```bash
docker compose up --build
```

Set `AUTH_SECRET` and `ENCRYPTION_KEY` in the environment before building. Next.js inlines `AUTH_SECRET` into middleware at build time, so the build and the running process must use the same value.

`docker-compose.yml` also starts PostgreSQL. The checked-in Prisma schema uses SQLite so `npm test` and `npm run dev` work without Docker. To use Postgres:

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` to the Postgres URL.
3. Run `npx prisma migrate dev` to create a Postgres migration.
4. Deploy with `npx prisma migrate deploy`.

## Railway or Fly

1. Create the empty GitHub repository above and push this project.
2. Create a project on Railway or Fly from that repository using the `Dockerfile`.
3. Add a Postgres database and set `DATABASE_URL`.
4. Set `AUTH_SECRET`, `ENCRYPTION_KEY`, and `DEMO_MODE=false`.
5. Set Stripe keys only when you want paid checkout. Until then the API returns “Stripe is not configured” and does not change the plan.
6. Add OANDA or Alpaca keys only on the server, or enter them in the Brokers page after `ENCRYPTION_KEY` is set.

There is no public URL until those credentials exist. This repository does not invent one.

## GitHub Actions

`.github/workflows/ci.yml` installs, migrates a SQLite file, lints, typechecks, tests, and builds.
