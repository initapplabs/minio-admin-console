# MinIO Console

A modern admin web console for MinIO (Community Edition). Built with Next.js (App Router) for both frontend and backend — every admin action is performed server-side by shelling out to the official `mc` (MinIO Client) binary, never by talking to undocumented internal APIs.

## How it works

- The Next.js server is configured once at boot with your MinIO **admin** access key / secret key (via environment variables).
- The same access key + secret key pair is used to log into the console itself — there's no separate console user database.
- Every admin action (bucket lifecycle, IAM users/groups/policies, service accounts, quotas, encryption, replication, healing, tiers, KMS, batch jobs, live logs) is implemented as a typed wrapper around an `mc` subcommand, invoked as a subprocess with `--json` output, never via shell string interpolation.
- Sessions are signed JWT cookies (httpOnly, secure in production). The browser never sees the MinIO secret key after login.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your MinIO endpoint + admin keys + a random SESSION_SECRET
npm run dev
```

You'll also need the `mc` binary available on your PATH locally (or set `MC_BINARY_PATH`):

```bash
curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc
```

## Docker

```bash
docker compose up --build
```

This starts a MinIO instance plus the console, wired together. Visit `http://localhost:3000` and sign in with the access/secret key from your `.env` (defaults to `minioadmin` / `minioadmin123` if unset — change this for anything beyond local testing).

To run the console against an **existing** MinIO deployment instead, build just the console image:

```bash
docker build -t minio-console .
docker run -p 3000:3000 \
  -e MINIO_ENDPOINT=https://your-minio.example.com \
  -e MINIO_ACCESS_KEY=... \
  -e MINIO_SECRET_KEY=... \
  -e SESSION_SECRET=$(openssl rand -base64 32) \
  minio-console
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MINIO_ENDPOINT` | yes | e.g. `http://minio:9000` |
| `MINIO_ACCESS_KEY` | yes | MinIO admin access key — also the console login username |
| `MINIO_SECRET_KEY` | yes | MinIO admin secret key — also the console login password |
| `MINIO_API_INSECURE` | no | `true` to skip TLS verification for self-signed certs |
| `SESSION_SECRET` | yes | Random string ≥16 chars, signs session cookies |
| `MC_BINARY_PATH` | no | Defaults to `mc` on PATH (`/usr/local/bin/mc` in Docker) |
| `MC_CONFIG_DIR` | no | Defaults to `/app/.mc` in Docker |

## Project structure

```
src/lib/mc/         mc subprocess executor + typed service wrappers (buckets, objects, iam, admin)
src/lib/auth/       session cookie issuance/verification, API route auth guard
src/app/api/        Next.js route handlers — one per admin action, thin wrappers over src/lib/mc
src/app/(dashboard) authenticated pages: buckets, identity, monitoring, settings, batch
src/components/      UI primitives + feature components
src/middleware.ts    redirects unauthenticated requests to /login
```

## Notes on scope

This covers the core MinIO Community Edition admin surface: bucket CRUD, versioning, quotas, policies/anonymous access, lifecycle rules, encryption, replication targets, object browsing/upload/download/presigned links, IAM users/groups/policies, service accounts, cluster info, Prometheus metrics, live log tailing, heal triggers, server config get/set, storage tiers, KMS key management, and batch job listing.

Some advanced flows (e.g. full ILM transition-tier UI, fine-grained replication topology editing, notification target wiring) are wired at the API/service layer but have lighter-weight UI — extend the relevant page in `src/app/(dashboard)` following the existing patterns.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
