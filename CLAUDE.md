@AGENTS.md

## Source of Truth

These Notion pages are the canonical spec. Never contradict them. If code and spec disagree, stop and ask.

- **System Spec:** https://www.notion.so/3fc08d8fd60281b48ee6ebe632557071
- **Strategy Playbook:** https://www.notion.so/3fc08d8fd6028134a772db2527435128

**Rule:** Re-read the Spec Changelog (section 10) at the start of each session.

## Future Features

### Campaign Linking for Posts
Posts should track their connection to strategy, not just classification:
- `campaignId` - which campaign the post belongs to
- `purpose` - the role it plays ("establish expertise", "drive to website", "build trust")
- `sequence` - where it fits in campaign flow (post 1 of 5, follow-up to X)

This enables:
- Table view showing campaign association
- Campaigns page grouping posts with performance data
- Strategic planning vs just content categorization

## Session Protocol (multiple Claude sessions)

Several Claude sessions may work on this repo at once. Each owns one area (see the `Session` column on the Claude Coding Tasks board in Notion: Infra / Renderer / Reports).

- **Start of a task:** set its Notion row to `In progress`, fill `Now` with one line, set `Branch`.
- **Each meaningful step:** overwrite `Now`.
- **Need Thomas:** set `Blocked`, write the question in `Questions for Thomas`, push-notify him.
- **Finished:** `Review` + `Result summary`. Merge to main only when Thomas has said to.
- Work only on your own `task/CT-*` branch and your own area's files. Don't edit another session's in-flight files; if you must touch shared code (e.g. `src/lib/notion/*`), keep the change small and rebase on main first.
- Board view: "Sessions (live)" on Claude Coding Tasks.
- **Mission Control** (Thomas's steering page): https://www.notion.so/40008d8fd6028113adb4f20ec01723f7 — when you finish a task, get blocked, or learn a client signal (IG connected, link opened, answers in), rewrite your own row/section there and the "Updated … by <session>" footer. Keep "Needs you" to the top 3 things only Thomas can do. Summaries only; detail stays on the task board.
