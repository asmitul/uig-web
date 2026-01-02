## Uyghur Interactive Glossary

UIG Web is the production home of the Uyghur Interactive Glossary—our online Uyghur dictionary that surfaces Uyghur terms alongside their English and Turkish translations plus optional pronunciation audio. The site is built with Next.js 16 (Pages Router); the landing page (`src/pages/index.tsx`) statically fetches vocabulary from the Payload CMS running at `https://admin.uig.me` (or any endpoint you configure) and renders dictionary entries with Tailwind CSS v4 styling (`src/styles/globals.css`).

**Why this repository exists**
- Provide a fast, searchable Uyghur dictionary that works on desktop and mobile.
- Keep Uyghur, English, and Turkish translations synchronized from the CMS so editors can maintain entries without redeploys.
- Offer pronunciation audio to help learners hear the correct Uyghur pronunciation.

---

## Prerequisites

- Node.js 20+ (align with Vercel/Next 16 requirements)
- `pnpm` 8+ (lockfile committed)
- Access to a Payload CMS instance seeded with the glossary collection

---

## Installation

```bash
pnpm install
```

The repo uses two-space indentation, double quotes, and arrow-function components—match that style when contributing.

---

## Environment Configuration

Create `.env.local` at the project root with at least one CMS base URL:

```bash
NEXT_PUBLIC_CMS_BASE_URL=https://admin.uig.me
# Optional server-only fallback:
# CMS_BASE_URL=https://admin.uig.me
```

- `NEXT_PUBLIC_CMS_BASE_URL` is shared by server and client bundles and is the preferred override.
- `CMS_BASE_URL` exists as a server-only fallback when you cannot expose the URL publicly.
- When neither variable is set, the code falls back to `https://admin.uig.me` (`src/pages/index.tsx:21-35`), so the glossary still renders using published entries but you cannot preview draft content.

If you self-host Payload, ensure it exposes `/api/words?depth=1` and that authentication (if any) allows public reads or that you proxy the request.

---

## CMS Schema Primer

The UI expects the Payload “Word” collection to match `src/interfaces/word.ts`:

| Field           | Type                      | Notes                                                                 |
| --------------- | ------------------------- | --------------------------------------------------------------------- |
| `word_uyghur`   | string (required)         | Main Uyghur spelling                                                  |
| `word_english`  | string (required)         | English translation                                                   |
| `word_turkish`  | string (required)         | Turkish translation                                                   |
| `pronunciation` | media relation or string | Optional audio clip; code resolves relative `/media/*` paths or URLs  |

Audio playback is handled via `resolvePronunciationUrl` in `src/pages/index.tsx:44-78`. Provide either an absolute URL or a Payload media field whose `url`/`filename` points to `/media/...`.

---

## Running & Scripts

| Command       | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `pnpm dev`    | Starts `http://localhost:3000` with hot reload.                         |
| `pnpm build`  | Runs the production Next compiler and TypeScript checks.                |
| `pnpm start`  | Serves the `.next` output (simulate production).                        |
| `pnpm lint`   | Runs ESLint 9 with the Next config.                                     |

API routes live under `src/pages/api`. You can confirm the boilerplate endpoint after `pnpm dev` with:

```bash
curl http://localhost:3000/api/hello
```

---

## Manual QA Checklist

Because we do not ship automated tests yet (`package.json` has no `test` script), add notes for these flows in every PR:

1. **Glossary render** – With a fresh `pnpm build && pnpm start`, confirm CMS words appear and match the configured base URL.
2. **Search filtering** – Type Uyghur and English terms; results should filter in real time.
3. **Pronunciation audio** – Verify play/pause toggling and that the active row resets when audio ends.
4. **CMS override** – Document which `NEXT_PUBLIC_CMS_BASE_URL` you used and whether the payload required authentication.
5. **Fallback behavior** – Temporarily point the env var to an unreachable host; ensure the UI falls back to the hardcoded sample list and logs the fetch failure.

---

## Deployment Notes

- Production deploys (Vercel, Docker, etc.) must provide `NEXT_PUBLIC_CMS_BASE_URL` via environment variables. Without it, the site will default to the public CMS and only show published entries.
- `next.config.ts` enables `reactStrictMode` and `output: "standalone"`, so the project can be containerized directly after `pnpm build`.
- If the CMS is down or misconfigured, `getStaticProps` throws (`src/pages/index.tsx:80-100`), and ISR will keep serving the last successful glossary. Watch build logs for “Failed to fetch glossary words from CMS.”

---

## Troubleshooting

- **Network errors during build** – Verify the CMS host allows connections from your build environment. For protected instances, expose a read-only endpoint or run builds within the same network.
- **Audio not playing** – Confirm the media asset returns `Content-Type: audio/*` and that CORS headers allow the origin. Absolute URLs are safest.
- **Tailwind styles missing** – Ensure `src/styles/globals.css` is imported in `_app.tsx` (already wired) and that you did not remove the PostCSS/Tailwind pipeline.

With the CMS configured and env vars in place, contributors can install dependencies, run `pnpm dev`, and start iterating on the glossary immediately.
