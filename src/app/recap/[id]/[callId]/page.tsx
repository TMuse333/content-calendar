/**
 * Client recap — a standalone, print-ready takeaways page for one call.
 * Server-rendered from the cached debrief (no app chrome), so it prints clean:
 * open → Cmd/Ctrl+P → Save as PDF → send to the client.
 */
import { buildRecap } from "@/lib/calls/recap";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const CSS = `
  * { box-sizing: border-box; }
  .recap { --ground:#0b0b0d; --panel:#141318; --line:#27262e; --line-hi:#38363f;
    --ink:#f5f3ef; --ink-mid:#b4b2ba; --ink-dim:#817f89; --edge:#35d0e0;
    --edge-soft:rgba(53,208,224,.12); --gold:#d9b36b;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    background:radial-gradient(1200px 500px at 50% -200px,#141821,transparent),var(--ground);
    color:var(--ink); font-family:var(--sans); min-height:100vh; padding:56px 24px 80px; }
  .recap .sheet { max-width:760px; margin:0 auto; }
  .recap .label { font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--edge); }
  .recap .label.dim { color:var(--ink-dim); }
  .recap .mast { text-align:center; padding-bottom:36px; border-bottom:1px solid var(--line); }
  .recap .mast h1 { font-family:var(--serif); font-weight:600; font-size:clamp(30px,5vw,46px);
    line-height:1.08; letter-spacing:-.01em; margin:16px auto 14px; max-width:16ch; text-wrap:balance; }
  .recap .mast .sub { color:var(--ink-mid); font-size:14px; }
  .recap .mast .sub b { color:var(--ink); font-weight:600; }
  .recap section { margin-top:48px; }
  .recap .sec-head { display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:20px; }
  .recap .sec-head h2 { font-family:var(--serif); font-weight:600; font-size:23px; margin:0; letter-spacing:-.01em; }
  .recap .sec-head .count { font-size:13px; color:var(--ink-dim); }
  .recap .intro { border:1px solid var(--line); border-radius:16px; padding:26px 28px; background:var(--panel); }
  .recap .intro .lead { font-size:16px; line-height:1.62; color:var(--ink); margin:12px 0 0; max-width:60ch; }
  .recap .intro .lead b { color:var(--edge); font-weight:600; }
  .recap .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:22px; }
  .recap .step { display:flex; gap:11px; align-items:flex-start; font-size:13.5px; color:var(--ink-mid); line-height:1.45; }
  .recap .step .sn { flex:none; width:24px; height:24px; border-radius:50%; display:grid; place-items:center;
    font-family:var(--serif); font-size:13px; color:var(--edge); border:1px solid var(--edge); background:var(--edge-soft); }
  .recap .edge { border:1px solid var(--line-hi); border-radius:18px; padding:28px 30px;
    background:linear-gradient(170deg,var(--edge-soft),var(--panel) 60%); box-shadow:0 0 40px rgba(53,208,224,.08); }
  .recap .edge .star { color:var(--edge); font-size:13px; letter-spacing:.2em; text-transform:uppercase; }
  .recap .edge h3 { font-family:var(--serif); font-size:32px; font-weight:600; margin:8px 0 10px; letter-spacing:-.01em; }
  .recap .edge p { color:var(--ink-mid); font-size:15px; line-height:1.55; margin:0 0 16px; max-width:54ch; }
  .recap .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .recap .chip { font-size:12.5px; padding:5px 12px; border-radius:40px; border:1px solid var(--line-hi);
    color:var(--ink-mid); background:rgba(255,255,255,.015); }
  .recap .chip.on { border-color:var(--edge); color:var(--edge); background:var(--edge-soft); }
  .recap .cover { display:flex; align-items:center; gap:26px; border:1px solid var(--line); border-radius:16px;
    padding:22px 26px; background:var(--panel); }
  .recap .cover .txt h4 { margin:0 0 6px; font-family:var(--serif); font-size:19px; font-weight:600; }
  .recap .cover .txt p { margin:0; color:var(--ink-mid); font-size:13.5px; line-height:1.5; }
  .recap .vid { display:flex; gap:18px; padding:22px 0; border-top:1px solid var(--line); break-inside:avoid; }
  .recap .vid:first-of-type { border-top:none; }
  .recap .vid .no { font-family:var(--serif); font-size:26px; color:var(--ink-dim); line-height:1; width:34px; flex:none; font-variant-numeric:tabular-nums; }
  .recap .vid .main { flex:1; min-width:0; }
  .recap .vid .tags { display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap; }
  .recap .tag { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-dim); }
  .recap .tag.edge { color:var(--edge); }
  .recap .tag.fmt { color:var(--ink-mid); border:1px solid var(--line-hi); padding:2px 9px; border-radius:30px; letter-spacing:.04em; }
  .recap .vid h3 { font-family:var(--serif); font-size:19px; font-weight:600; line-height:1.3; margin:0 0 10px; letter-spacing:-.005em; }
  .recap .hook { border-left:2px solid var(--edge); padding-left:13px; color:var(--ink-mid); font-size:13.5px; line-height:1.5; font-style:italic; }
  .recap .hook .lead { display:block; font-style:normal; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-dim); margin-bottom:4px; }
  .recap .opp { border:1px solid var(--line); border-left:3px solid var(--gold); border-radius:12px; padding:16px 18px; margin-bottom:12px; background:var(--panel); break-inside:avoid; }
  .recap .opp h4 { margin:0 0 5px; font-size:15px; font-weight:650; }
  .recap .opp p { margin:0; color:var(--ink-mid); font-size:13px; line-height:1.5; }
  .recap .confirm { border:1px dashed var(--line-hi); border-radius:12px; padding:18px 22px; background:rgba(255,255,255,.012); }
  .recap .confirm ul { margin:10px 0 0; padding-left:18px; }
  .recap .confirm li { color:var(--ink-mid); font-size:13.5px; line-height:1.7; }
  .recap footer { margin-top:56px; padding-top:24px; border-top:1px solid var(--line); text-align:center; color:var(--ink-dim); font-size:12.5px; }
  .recap footer .mark { color:var(--edge); font-weight:600; letter-spacing:.04em; }
  .print-btn { position:fixed; top:18px; right:18px; z-index:50; font-family:var(--sans,sans-serif);
    font-size:13px; font-weight:600; color:#0b0b0d; background:#35d0e0; border:none; border-radius:8px;
    padding:9px 16px; cursor:pointer; box-shadow:0 4px 18px rgba(53,208,224,.3); }
  .recap .notice { max-width:520px; margin:120px auto; text-align:center; color:var(--ink-mid); font-size:15px; line-height:1.6; }
  @media print {
    .noprint { display:none !important; }
    .recap { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; min-height:0; }
  }
`;

const NOTICE: Record<string, string> = {
  "no-account": "We couldn't find this account.",
  "no-config": "This account isn't connected to Notion yet.",
  "not-analyzed": "This call hasn't been analyzed yet. Open it in the Tree (call view) and run the analysis first, then come back here.",
};

export default async function RecapPage({ params }: { params: Promise<{ id: string; callId: string }> }) {
  const { id, callId } = await params;
  const result = await buildRecap(id, callId);

  if (!result.ok) {
    return (
      <div className="recap">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="notice">{NOTICE[result.reason]}</div>
      </div>
    );
  }

  const d = result.data;
  const pct = d.totalSituations ? d.touchedCount / d.totalSituations : 0;
  const r = 38,
    cx = 46,
    cy = 46,
    circ = 2 * Math.PI * r;

  return (
    <div className="recap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <PrintButton />
      <div className="sheet">
        <div className="mast">
          <div className="label">Content plan · prepared for you</div>
          <h1>Takeaways from our call</h1>
          <div className="sub">
            <b>{d.client}</b>
            {d.callTitle ? ` · ${d.callTitle}` : ""}
            {d.callDate ? ` · ${d.callDate}` : ""}
          </div>
        </div>

        <section>
          <div className="intro">
            <div className="label dim">How this works</div>
            <p className="lead">
              Every person who calls you is in a <b>situation</b> — buying from away, downsizing, selling a cottage before
              winter. We listen to your story calls, map the real situations your buyers and sellers are in, and turn the
              ones you&rsquo;re strongest in into short videos that reach exactly those people. Here&rsquo;s what came out of
              our last call.
            </p>
            <div className="steps">
              <div className="step"><span className="sn">1</span><span>We listen to your story calls — like the one we just had.</span></div>
              <div className="step"><span className="sn">2</span><span>We map the real situations your buyers &amp; sellers are in.</span></div>
              <div className="step"><span className="sn">3</span><span>We make videos for those — leading with your <b style={{ color: "var(--edge)", fontWeight: 600 }}>edge</b>, the one you own more than anyone.</span></div>
            </div>
          </div>
        </section>

        {d.niche && (
          <section>
            <div className="edge">
              <div className="star">★ Your edge</div>
              <h3>{d.niche}</h3>
              <p>
                The move only you can own on the Island — the people buying here from out of province. Nearly every idea
                below leans into it, because it&rsquo;s where you&rsquo;re strongest and least matched.
              </p>
              {d.edgeTouched.length > 0 && (
                <div className="chips">
                  {d.edgeTouched.map((t) => (
                    <span className="chip on" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="cover">
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ flex: "none" }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#26262e" strokeWidth="8" />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#35d0e0"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
              <text x={cx} y={cy - 2} textAnchor="middle" fill="#f5f3ef" fontSize="20" fontWeight="600" fontFamily="Georgia, serif">
                {d.touchedCount}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" fill="#817f89" fontSize="10">
                of {d.totalSituations}
              </text>
            </svg>
            <div className="txt">
              <h4>
                We covered {d.touchedCount} of your {d.totalSituations} client situations
              </h4>
              <p>
                These came up naturally in how you talk about your work — which is exactly what makes the content feel like
                you.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="sec-head">
            <h2>Ideas for videos</h2>
            <span className="count">{d.videos.length} ideas from this call</span>
          </div>
          {d.videos.map((v, i) => (
            <div className="vid" key={i}>
              <div className="no">{String(i + 1).padStart(2, "0")}</div>
              <div className="main">
                <div className="tags">
                  {v.edge && <span className="tag edge">★ Your edge</span>}
                  <span className="tag fmt">{v.format}</span>
                  <span className="tag">{v.lens}</span>
                </div>
                <h3>{v.title}</h3>
                {v.source && (
                  <div className="hook">
                    <span className="lead">From your call — where this came from</span>
                    {v.source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        {d.otherTouched.length > 0 && (
          <section>
            <div className="sec-head">
              <h2>Also touched on this call</h2>
            </div>
            <div className="chips">
              {d.otherTouched.map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {d.opportunities.length > 0 && (
          <section>
            <div className="sec-head">
              <h2>Story ideas we spotted</h2>
              <span className="count">moments worth filming next time</span>
            </div>
            {d.opportunities.map((o, i) => (
              <div className="opp" key={i}>
                <h4>{o.title}</h4>
                <p>{o.summary}</p>
              </div>
            ))}
          </section>
        )}

        {d.confirm.length > 0 && (
          <section>
            <div className="confirm">
              <div className="label dim">Before these go live, we&rsquo;ll double-check</div>
              <ul>
                {d.confirm.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <footer>
          Prepared by <span className="mark">Waterline</span> · your situation map stays updated after every call.
        </footer>
      </div>
    </div>
  );
}
