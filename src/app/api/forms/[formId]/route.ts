/**
 * Form Config API
 *
 * GET    /api/forms/[formId] - Get form config (public, CORS enabled)
 * PUT    /api/forms/[formId] - Update form
 * DELETE /api/forms/[formId] - Delete form
 */

import { NextResponse } from "next/server";
import {
  getFormById,
  updateForm,
  deleteForm,
} from "@/lib/mongodb/forms";

export const dynamic = "force-dynamic";

// CORS headers for public access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/**
 * OPTIONS /api/forms/[formId]
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/forms/[formId]
 * Get form config - public endpoint for form.js
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const form = await getFormById(formId);

    if (!form) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!form.isActive) {
      return NextResponse.json(
        { success: false, error: "Form is not active" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return public config (without internal fields)
    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        submitText: form.submitText,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        styling: form.styling,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[api:forms/[formId]/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch form" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/forms/[formId]
 * Update form configuration
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();

    const form = await updateForm(formId, body);

    if (!form) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404 }
      );
    }

    console.log(`[api:forms/[formId]/PUT] Updated form: ${formId}`);

    return NextResponse.json({
      success: true,
      form,
    });
  } catch (error) {
    console.error("[api:forms/[formId]/PUT]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update form" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forms/[formId]
 * Soft delete form
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const deleted = await deleteForm(formId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404 }
      );
    }

    console.log(`[api:forms/[formId]/DELETE] Deleted form: ${formId}`);

    return NextResponse.json({
      success: true,
      message: "Form deleted",
    });
  } catch (error) {
    console.error("[api:forms/[formId]/DELETE]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete form" },
      { status: 500 }
    );
  }
}
