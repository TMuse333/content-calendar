/**
 * Google Drive via the drive-bot service account (GOOGLE_SA_KEY env var,
 * base64 of the service-account JSON). Works in every app that carries the
 * same env var — this is the successor to the per-client Apps Script proxy.
 *
 * Access model: the bot sees ONLY folders explicitly shared with
 * drive-bot@…iam.gserviceaccount.com. Share a parent folder once and all
 * client subfolders inherit.
 */
import { google, type drive_v3 } from "googleapis";

let cached: drive_v3.Drive | null = null;

export function getDrive(): drive_v3.Drive {
  if (cached) return cached;
  const b64 = process.env.GOOGLE_SA_KEY;
  if (!b64) throw new Error("Missing GOOGLE_SA_KEY environment variable");
  const creds = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  cached = google.drive({ version: "v3", auth });
  return cached;
}

export interface DriveEntry {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
}

/** List a folder's direct children (folders first, then by name). */
export async function listFolder(folderId: string): Promise<DriveEntry[]> {
  const drive = getDrive();
  const entries: DriveEntry[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      entries.push({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType ?? "",
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
        size: f.size ? Number(f.size) : undefined,
        modifiedTime: f.modifiedTime ?? undefined,
        webViewLink: f.webViewLink ?? undefined,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return entries.sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name));
}

/** Everything shared with the bot (top-level entry points). */
export async function listSharedRoots(): Promise<DriveEntry[]> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: "sharedWithMe = true and trashed = false",
    fields: "files(id, name, mimeType, webViewLink)",
    pageSize: 100,
  });
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType ?? "",
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
    webViewLink: f.webViewLink ?? undefined,
  }));
}

/** Download a file's bytes (for re-hosting, conversion, etc.). */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}
