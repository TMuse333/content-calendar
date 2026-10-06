/**
 * Form Submit API
 *
 * POST /api/forms/[formId]/submit - Submit form data
 *
 * This endpoint is public and CORS-enabled for cross-origin submissions
 */

import { NextResponse } from "next/server";
import { getFormById, createFormSubmission } from "@/lib/mongodb/forms";
import clientPromise from "@/lib/mongodb/clientPromise";
import type { Outcome } from "@/lib/types/results";

export const dynamic = "force-dynamic";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/**
 * OPTIONS /api/forms/[formId]/submit
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create an Outcome record from form submission
 */
async function createOutcomeFromSubmission(
  accountId: string,
  formTitle: string,
  data: Record<string, string>,
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string },
  referrer?: string
): Promise<string> {
  const client = await clientPromise;
  const db = client.db("strategy");
  const outcomes = db.collection("outcomes");

  const now = new Date();

  // Extract lead info from common field names
  const leadName = data.name || data.fullName || data.full_name || data.firstName || "";
  const leadEmail = data.email || data.emailAddress || data.email_address || "";
  const leadPhone = data.phone || data.phoneNumber || data.phone_number || data.tel || "";

  // Build description from form data
  const descriptionParts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value && !["name", "fullName", "full_name", "firstName", "email", "emailAddress", "email_address", "phone", "phoneNumber", "phone_number", "tel"].includes(key)) {
      descriptionParts.push(`${key}: ${value}`);
    }
  }

  const outcome: Omit<Outcome, "id"> = {
    accountId,
    type: "inquiry",
    title: `Form Submission: ${formTitle}`,
    description: descriptionParts.join("\n") || undefined,
    occurredAt: now,
    attributions: [],
    source: utm?.source || "website",
    medium: utm?.medium || "form",
    campaign: utm?.campaign,
    referrer,
    leadName: leadName || undefined,
    leadEmail: leadEmail || undefined,
    leadPhone: leadPhone || undefined,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };

  const result = await outcomes.insertOne(outcome);
  return result.insertedId.toString();
}

/**
 * POST /api/forms/[formId]/submit
 * Submit form data
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();

    // Validate form data
    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { success: false, error: "Form data is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get form to validate it exists and is active
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
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !body.data[field.name]?.trim()) {
        return NextResponse.json(
          { success: false, error: `${field.label} is required` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Create Outcome record
    const outcomeId = await createOutcomeFromSubmission(
      form.accountId,
      form.title,
      body.data,
      body.utm,
      body.referrer
    );

    // Create form submission record
    const submission = await createFormSubmission({
      formId,
      accountId: form.accountId,
      data: body.data,
      utm: body.utm,
      sessionId: body.sessionId,
      referrer: body.referrer,
      url: body.url,
      userAgent: body.userAgent,
      outcomeId,
    });

    console.log(`[api:forms/[formId]/submit] Submission ${submission.id} -> Outcome ${outcomeId}`);

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[api:forms/[formId]/submit]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to submit form" },
      { status: 500, headers: corsHeaders }
    );
  }
}
