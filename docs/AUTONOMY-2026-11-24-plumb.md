# AUTONOMY — Nov 24, 2026 · strategy-app station (plumbing session)

**END STATE:** The 6 from-away carousels (proposed to Greg Nov 23, `s/wM2vd9x00QG3orXPKh7SRA`) each carry a caption in Greg's voice and sit at `Ready for review` — Greg's 👍 on the share link then auto-approves a fully publishable post (slides + caption); nothing manual left between his tap and `schedule_post`.

**Why:** goal (a) content better — captions assembled from Greg's verbatim call quotes + the slides' own copy, per `BRIEF-carousels-call2.md` guardrails (anonymous, no unconfirmed numbers, no DM keywords); goal (c) — deletes the "operator writes captions later" blocker in every propose→approve chain.

**Plan:** slide copy read from Notion Previews → 6 captions → `scripts/caption-drafts.ts` (dry-run default) writes Caption + Status via existing `updatePostCaption`/`updatePostStatus` → verify hasCaption via get_upcoming → typecheck, pathspec-only commits to `task/CT-tree-read-models`.

**Will NOT touch:** publish/schedule (outward = flag only), other sessions' files (tree session shares this branch today), notify contract/catalog, Notion schema.

**Flagged:** captions + status are visible on Greg's live share page (that page exists for his review; listed in SITREP regardless).
