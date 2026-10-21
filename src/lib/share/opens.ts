/**
 * Human-readable open status for the admin Share panel (pure, client-safe).
 */
export interface OpenInfo {
  openCount?: number;
  firstOpenedAt?: string | Date | null;
  lastOpenedAt?: string | Date | null;
}

function when(d: string | Date, now: Date): string {
  const date = new Date(d);
  const time = date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `today ${time}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (date.toDateString() === yesterday.toDateString()) return `yesterday ${time}`;
  return `${date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })} ${time}`;
}

export function describeOpens(info: OpenInfo, now = new Date()): { opened: boolean; text: string } {
  const count = info.openCount ?? 0;
  if (!count || !info.lastOpenedAt) return { opened: false, text: "Not opened yet" };
  const last = when(info.lastOpenedAt, now);
  if (count === 1) return { opened: true, text: `Opened once · ${last}` };
  const first = info.firstOpenedAt ? `first ${when(info.firstOpenedAt, now)} · ` : "";
  return { opened: true, text: `Opened ${count}× · ${first}last ${last}` };
}
