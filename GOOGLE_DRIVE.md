# Google Drive access — how to add it to any app

All Syntellic apps share one Google Drive credential: a service account
called **drive-bot** (`drive-bot@syntellic-infra.iam.gserviceaccount.com`,
GCP project `syntellic-infra`). It can read/write any Drive folder that has
been shared with that email. No OAuth flows, no token refresh, no Apps
Script proxies.

This repo (strategy-app) is the reference implementation. To give another
app Drive access, you copy one file and one env var. ~5 minutes.

## 1. Copy the helper

Copy [`src/lib/google/drive.ts`](src/lib/google/drive.ts) from this repo
into the target app (any path; keep the name). It exposes:

```ts
getDrive()                 // raw googleapis Drive client (v3), auth included
listFolder(folderId)       // direct children of a folder (folders first)
listSharedRoots()          // every folder/file shared with the bot
downloadFile(fileId)       // file bytes as a Buffer
```

## 2. Install the dependency

```bash
npm install googleapis
```

## 3. Add the env var

```
GOOGLE_SA_KEY=<base64 of the service-account JSON key>
```

- **Where to get the value:** copy it from this repo's `.env.local` (line
  starting `GOOGLE_SA_KEY=`), or from any Vercel project that already has it.
  Do NOT regenerate the key in Google Cloud unless it's been lost — key
  creation is blocked by org policy and needs a temporary policy lift.
- **Local dev:** put it in the app's `.env.local` (gitignored — never commit).
- **Vercel:** Project → Settings → Environment Variables → add
  `GOOGLE_SA_KEY` for Production/Preview/Development.

## 4. Use it

```ts
import { listFolder, downloadFile } from "@/lib/google/drive";

const items = await listFolder("1Jt0oPHiOtQ5N_OLEC0K7zW5-YOSwotyn"); // greg-caseley
const bytes = await downloadFile(items[0].id);
```

Folder IDs: open the folder in Drive — the ID is the part of the URL after
`/folders/`. Per-client folder IDs belong in per-account config (e.g. the
Account doc's `driveFolderId` in strategy-app), not hardcoded.

## Giving the bot access to a new folder / client

In Google Drive: right-click the folder → Share →
`drive-bot@syntellic-infra.iam.gserviceaccount.com` → **Editor**.
Subfolders inherit, so sharing a parent folder once covers every client
folder inside it.

## Known folder IDs

| Folder | ID |
|---|---|
| greg-caseley (client root) | `1Jt0oPHiOtQ5N_OLEC0K7zW5-YOSwotyn` |

## Gotchas

- **The bot only sees what's shared with it.** Empty list = the folder
  wasn't shared with the bot's email (or the share hasn't propagated — give
  it a minute).
- **Uploads are owned by the service account**, not by Thomas, and count
  against the bot's own 15 GB quota. Fine for images/small video; revisit
  (Workspace Shared Drive) if that ever bites.
- **Key security:** the base64 blob IS the credential. Env vars and password
  manager only — never in git, chat logs, or client-side code. If it ever
  leaks: delete the key on the service account in GCP (Keys tab), lift the
  org policy, mint a new one, update every app's env.
- Legacy: the old Apps Script proxy (`GREG_CASELEY_DRIVE_API_URL`) still
  backs strategy-app's `/api/drive/greg-caseley` route. New code should use
  the service-account helper instead; the proxy dies once that route is
  migrated.
