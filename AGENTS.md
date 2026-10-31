# Sandbox notes (Base44)

Single Next.js 15 (App Router) app. No database, no auth; the only backend is the
app's own API routes (`/api/transactions`, `/api/threats`), served by the same
Next process.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- Dev server: `next dev --turbopack -p 9002`, published on host port **3000**.
- `node_modules` lives in the named volume `web_node_modules`; the startup command
  runs `npm ci` whenever `package-lock.json`'s hash changes, so dependency edits
  need no image rebuild.
- Because the repo is bind-mounted, source edits hot-reload. Restart the service
  only after changing `next.config.ts` / env vars, then refresh the preview.

## Things that are not obvious

- `src/ai/genkit.ts` builds the Genkit plugin at import time. `googleAI()` reads
  `GOOGLE_GENKIT_API_KEY` (or `GEMINI_API_KEY`) lazily, so pages compile and render
  without a key — only the AI calls fail. Real key goes in the platform secrets
  (`/run/base44/app.env`), never in the repo.
- `next/font/google` (Geist) downloads fonts during first compile; the container
  needs outbound network on the first request after a cold start.
- Next 15 gates dev assets/HMR by Origin. `next.config.ts` only adds
  `allowedDevOrigins` for `3000-${BASE44_PUBLIC_HOST_SUFFIX}` when
  `BASE44_PREVIEW_MODE === "1"`; with the flag unset the config is unchanged.

## Verify it works

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
docker compose -f docker-compose.base44.yml exec -T web npx tsc --noEmit   # optional type check
```
