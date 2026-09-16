import { NextRequest, NextResponse } from "next/server";
import { fetchPostInsights } from "@/lib/platforms/instagram";

// GET /api/instagram/insights - Get post insights
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const untilParam = searchParams.get("until");

  const since = sinceParam ? new Date(sinceParam) : undefined;
  const until = untilParam ? new Date(untilParam) : undefined;

  const result = await fetchPostInsights({ since, until });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
