/**
 * Question Bank API
 * GET /api/accounts/[id]/graphic-packages/[packageId]/questions - List questions
 * POST /api/accounts/[id]/graphic-packages/[packageId]/questions - Add question
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getGraphicPackageById,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/lib/mongodb/graphic-packages";
import type { CreateQuestionRequest } from "@/lib/types/graphic-package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    const questions = await getQuestions(packageId);

    // Group by status
    const unused = questions.filter(q => q.status === "unused");
    const scheduled = questions.filter(q => q.status === "scheduled");
    const published = questions.filter(q => q.status === "published");

    return NextResponse.json({
      data: questions,
      count: questions.length,
      byStatus: {
        unused: unused.length,
        scheduled: scheduled.length,
        published: published.length,
      },
    });
  } catch (error) {
    console.error("[api:questions GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const data: CreateQuestionRequest = {
      question: body.question,
      category: body.category,
      notes: body.notes,
    };

    const question = await createQuestion(packageId, data);

    return NextResponse.json({ data: question }, { status: 201 });
  } catch (error) {
    console.error("[api:questions POST]", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId query param is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.question !== undefined) updates.question = body.question;
    if (body.category !== undefined) updates.category = body.category;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.status !== undefined) updates.status = body.status;

    await updateQuestion(questionId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:questions PUT]", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId query param is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    await deleteQuestion(questionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:questions DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
