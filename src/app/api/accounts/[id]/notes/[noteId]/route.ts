/**
 * Single Note API
 * GET /api/accounts/[id]/notes/[noteId] - Get a note
 * PUT /api/accounts/[id]/notes/[noteId] - Update a note
 * DELETE /api/accounts/[id]/notes/[noteId] - Delete a note
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getNoteById, updateNote, deleteNote } from "@/lib/mongodb/notes";
import type { NoteType } from "@/lib/types/post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, noteId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const note = await getNoteById(noteId);

    if (!note) {
      return NextResponse.json(
        { error: `Note "${noteId}" not found` },
        { status: 404 }
      );
    }

    // Verify note belongs to this account
    if (note.accountId !== id) {
      return NextResponse.json(
        { error: "Note does not belong to this account" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error("[api:notes/[noteId] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, noteId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return NextResponse.json(
        { error: `Note "${noteId}" not found` },
        { status: 404 }
      );
    }

    if (note.accountId !== id) {
      return NextResponse.json(
        { error: "Note does not belong to this account" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, type, linkedInsightId, linkedPostId } = body;

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content;
    if (type !== undefined) {
      const validTypes: NoteType[] = ["idea", "observation", "action", "note"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: "Invalid note type" },
          { status: 400 }
        );
      }
      updates.type = type;
    }
    if (linkedInsightId !== undefined) updates.linkedInsightId = linkedInsightId;
    if (linkedPostId !== undefined) updates.linkedPostId = linkedPostId;

    const success = await updateNote(noteId, updates);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:notes/[noteId] PUT]", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, noteId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return NextResponse.json(
        { error: `Note "${noteId}" not found` },
        { status: 404 }
      );
    }

    if (note.accountId !== id) {
      return NextResponse.json(
        { error: "Note does not belong to this account" },
        { status: 403 }
      );
    }

    const success = await deleteNote(noteId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:notes/[noteId] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
