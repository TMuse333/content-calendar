/**
 * OAuth authorize endpoint + consent page (one-admin system).
 *
 * GET  — validates the request, shows a passphrase + access-level form.
 * POST — checks MCP_LOGIN_PASSWORD, issues a single-use PKCE code, redirects.
 *
 * The passphrase is typed into the page body (POST), never a URL. Wrong
 * passphrase re-renders the form; we never redirect an error to the client
 * for a bad human login (that would let bots probe).
 */
import { NextRequest, NextResponse } from "next/server";
import { getClient, issueCode, checkLoginPassword, type Scope } from "@/lib/oauth/provider";

interface AuthParams {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  scope: string;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function validate(p: Partial<AuthParams>): Promise<string | null> {
  if (!p.client_id || !p.redirect_uri || !p.code_challenge) return "Missing client_id, redirect_uri or code_challenge (PKCE required)";
  const client = await getClient(p.client_id);
  if (!client) return "Unknown client — re-add the connector so it re-registers";
  if (!client.redirectUris.includes(p.redirect_uri)) return "redirect_uri not registered for this client";
  return null;
}

function page(p: AuthParams, error?: string) {
  const hidden = (Object.entries(p) as [string, string][])
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v ?? "")}">`)
    .join("\n");
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect — Syntellic Strategy</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#09090b;color:#e4e4e7;font-family:system-ui">
<form method="POST" style="width:min(380px,90vw);background:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px">
  <h1 style="font-size:18px;margin:0 0 4px">Connect to Syntellic Strategy</h1>
  <p style="font-size:13px;color:#a1a1aa;margin:0 0 20px">${esc(p.client_id.startsWith("mcp_") ? "An MCP client" : p.client_id)} is asking for access.</p>
  ${error ? `<p style="font-size:13px;color:#f87171;margin:0 0 14px">${esc(error)}</p>` : ""}
  ${hidden}
  <label style="display:block;font-size:13px;margin-bottom:14px">Access level
    <select name="granted_scope" style="width:100%;margin-top:6px;padding:10px;background:#09090b;color:#e4e4e7;border:1px solid #3f3f46;border-radius:8px">
      <option value="publish" ${p.scope !== "read" ? "selected" : ""}>Full — read + stage + schedule + publish</option>
      <option value="read" ${p.scope === "read" ? "selected" : ""}>Read-only — metrics, tree, calls</option>
    </select>
  </label>
  <label style="display:block;font-size:13px;margin-bottom:20px">Passphrase
    <input name="password" type="password" autofocus autocomplete="current-password"
      style="width:100%;margin-top:6px;padding:10px;background:#09090b;color:#e4e4e7;border:1px solid #3f3f46;border-radius:8px;box-sizing:border-box">
  </label>
  <button style="width:100%;padding:11px;background:#06b6d4;color:#09090b;font-weight:600;border:0;border-radius:8px;font-size:14px;cursor:pointer">Authorize</button>
</form></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const p: AuthParams = {
    client_id: q.get("client_id") ?? "",
    redirect_uri: q.get("redirect_uri") ?? "",
    state: q.get("state") ?? "",
    code_challenge: q.get("code_challenge") ?? "",
    scope: q.get("scope") ?? "",
  };
  if ((q.get("code_challenge_method") ?? "S256") !== "S256") {
    return new NextResponse("Only PKCE S256 is supported", { status: 400 });
  }
  const problem = await validate(p);
  if (problem) return new NextResponse(esc(problem), { status: 400 });
  return page(p);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const p: AuthParams = {
    client_id: String(form.get("client_id") ?? ""),
    redirect_uri: String(form.get("redirect_uri") ?? ""),
    state: String(form.get("state") ?? ""),
    code_challenge: String(form.get("code_challenge") ?? ""),
    scope: String(form.get("scope") ?? ""),
  };
  const problem = await validate(p);
  if (problem) return new NextResponse(esc(problem), { status: 400 });

  if (!checkLoginPassword(String(form.get("password") ?? ""))) {
    return page(p, "Wrong passphrase");
  }
  const scope: Scope = form.get("granted_scope") === "read" ? "read" : "publish";
  const code = await issueCode({ clientId: p.client_id, redirectUri: p.redirect_uri, scope, codeChallenge: p.code_challenge });
  const to = new URL(p.redirect_uri);
  to.searchParams.set("code", code);
  if (p.state) to.searchParams.set("state", p.state);
  return NextResponse.redirect(to, 302);
}
