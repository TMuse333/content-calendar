/**
 * Notes API
 * GET /api/accounts/[id]/notes - Get all notes
 * POST /api/accounts/[id]/notes - Create a new note
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getNotes, createNote } from "@/lib/mongodb/notes";
import type { NoteType } from "@/lib/types/post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const notes = await getNotes(id);

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("[api:notes GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, type, linkedInsightId, linkedPostId } = body;

    if (!content || !type) {
      return NextResponse.json(
        { error: "Content and type are required" },
        { status: 400 }
      );
    }

    const validTypes: NoteType[] = ["idea", "observation", "action", "note"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid note type" },
        { status: 400 }
      );
    }

    const noteId = await createNote({
      accountId: id,
      content,
      type,
      linkedInsightId,
      linkedPostId,
    });

    return NextResponse.json({ success: true, noteId });
  } catch (error) {
    console.error("[api:notes POST]", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
