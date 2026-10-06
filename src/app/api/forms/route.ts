/**
 * Forms API
 *
 * GET  /api/forms?accountId=X - List forms for an account
 * POST /api/forms - Create a new form
 */

import { NextResponse } from "next/server";
import {
  getFormsByAccount,
  createForm,
  ensureFormIndexes,
} from "@/lib/mongodb/forms";
import type { FormField } from "@/lib/types/results";

export const dynamic = "force-dynamic";

/**
 * GET /api/forms?accountId=X
 * List forms for an account
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "accountId query parameter is required" },
        { status: 400 }
      );
    }

    await ensureFormIndexes();
    const forms = await getFormsByAccount(accountId, true);

    return NextResponse.json({
      success: true,
      forms,
      count: forms.length,
    });
  } catch (error) {
    console.error("[api:forms/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forms
 * Create a new form
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.accountId?.trim()) {
      return NextResponse.json(
        { success: false, error: "accountId is required" },
        { status: 400 }
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.fields) || body.fields.length === 0) {
      return NextResponse.json(
        { success: false, error: "fields array is required" },
        { status: 400 }
      );
    }

    // Validate fields
    for (const field of body.fields) {
      if (!field.name || !field.type || !field.label) {
        return NextResponse.json(
          { success: false, error: "Each field must have name, type, and label" },
          { status: 400 }
        );
      }
    }

    const form = await createForm({
      accountId: body.accountId,
      title: body.title,
      description: body.description,
      fields: body.fields as FormField[],
      submitText: body.submitText || "Submit",
      successMessage: body.successMessage || "Thank you! We'll be in touch soon.",
      redirectUrl: body.redirectUrl,
      styling: body.styling,
      isActive: body.isActive !== false,
    });

    console.log(`[api:forms/POST] Created form: ${form.id} for ${body.accountId}`);

    return NextResponse.json({
      success: true,
      form,
    });
  } catch (error) {
    console.error("[api:forms/POST]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create form" },
      { status: 500 }
    );
  }
}
