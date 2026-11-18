/**
 * Notion file uploads — attach real image files to a Files property.
 *
 * The SDK has no helper for the file-upload API, so this speaks HTTP directly:
 * create a file_upload → send bytes (multipart) → reference by id in a
 * property. Used by carousel staging to put slides on a post's "Preview".
 */

const NOTION_VERSION = "2022-06-28";

function headers(extra?: Record<string, string>): Record<string, string> {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error("NOTION_API_KEY is not set");
  return { Authorization: `Bearer ${key}`, "Notion-Version": NOTION_VERSION, ...extra };
}

/** Upload one file to Notion; returns the file_upload id to reference in properties. */
export async function uploadFileToNotion(
  filename: string,
  data: Buffer | Uint8Array,
  contentType = "image/png"
): Promise<string> {
  const create = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ filename, content_type: contentType }),
  });
  if (!create.ok) throw new Error(`file_upload create failed: HTTP ${create.status} ${await create.text()}`);
  const { id } = (await create.json()) as { id: string };

  const form = new FormData();
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  form.append("file", new Blob([bytes], { type: contentType }), filename);
  const send = await fetch(`https://api.notion.com/v1/file_uploads/${id}/send`, {
    method: "POST",
    headers: headers(), // fetch sets the multipart boundary itself
    body: form,
  });
  if (!send.ok) throw new Error(`file_upload send failed: HTTP ${send.status} ${await send.text()}`);
  return id;
}

/** Replace a page's Files property with the given uploads (order preserved). */
export async function setFilesProperty(
  pageId: string,
  property: string,
  uploads: Array<{ id: string; name: string }>
): Promise<void> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      properties: {
        [property]: { files: uploads.map((u) => ({ type: "file_upload", file_upload: { id: u.id }, name: u.name })) },
      },
    }),
  });
  if (!res.ok) throw new Error(`setFilesProperty failed: HTTP ${res.status} ${await res.text()}`);
}
