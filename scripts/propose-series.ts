/**
 * Propose a content series to a client: share link + ONE content.proposed
 * email via notify. The CLI face of src/lib/share/propose.ts.
 *
 *   npx tsx scripts/propose-series.ts --account greg-caseley \
 *     --title "From-away series" --posts <id,id,...> [--message "..."] \
 *     [--call <callId>] [--code <shareCode>] [--send]
 *
 * Default is a DRY RUN (email lands with the operator). Re-run with
 * --code <shareCode> --send after the operator's explicit GO — same link,
 * idempotency-keyed, cannot double-email.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { proposeContentSet } from "../src/lib/share/propose";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const accountId = arg("account");
  const title = arg("title");
  if (!accountId || !title) {
    console.error("Required: --account <id> --title <series name> and --posts <id,id,…> or --code <shareCode>");
    process.exit(1);
  }
  const result = await proposeContentSet({
    accountId,
    title,
    postIds: arg("posts")?.split(",").map((s) => s.trim()).filter(Boolean),
    shareCode: arg("code"),
    message: arg("message"),
    kind: arg("kind") ?? "carousels",
    callId: arg("call"),
    expiresInDays: arg("days") ? Number(arg("days")) : 14,
    dryRun: !process.argv.includes("--send"),
  });
  console.log(JSON.stringify(result, null, 2));
  if ("error" in result) process.exit(1);
  console.log(result.dryRun
    ? `\nDRY RUN — email went to the OPERATOR. After GO:\n  npx tsx scripts/propose-series.ts --account ${accountId} --title "${title}" --code ${result.code} --send`
    : "\nSENT to the client.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
