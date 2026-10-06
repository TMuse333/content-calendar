/**
 * Forms Collection
 *
 * CRUD operations for embeddable form configurations and submissions
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type { FormConfig, FormSubmission } from "../types/results";

// Constants
const DB_NAME = "strategy";
const FORMS_COLLECTION = "forms";
const SUBMISSIONS_COLLECTION = "form_submissions";

// Index tracking
let indexesEnsured = false;

/**
 * MongoDB document types
 */
interface FormConfigDocument extends Omit<FormConfig, "id"> {
  _id?: ObjectId;
}

interface FormSubmissionDocument extends Omit<FormSubmission, "id"> {
  _id?: ObjectId;
}

/**
 * Get the forms collection
 */
async function getFormsCollection(): Promise<Collection<FormConfigDocument>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<FormConfigDocument>(FORMS_COLLECTION);
}

/**
 * Get the form submissions collection
 */
async function getSubmissionsCollection(): Promise<Collection<FormSubmissionDocument>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<FormSubmissionDocument>(SUBMISSIONS_COLLECTION);
}

/**
 * Ensure indexes exist
 */
export async function ensureFormIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const forms = await getFormsCollection();
  const submissions = await getSubmissionsCollection();

  await Promise.all([
    // Forms indexes
    forms.createIndex({ accountId: 1 }),
    forms.createIndex({ isActive: 1 }),
    forms.createIndex({ accountId: 1, isActive: 1 }),

    // Submissions indexes
    submissions.createIndex({ formId: 1 }),
    submissions.createIndex({ accountId: 1 }),
    submissions.createIndex({ submittedAt: -1 }),
    submissions.createIndex({ accountId: 1, submittedAt: -1 }),
    submissions.createIndex({ "utm.campaign": 1 }, { sparse: true }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:forms] Indexes ensured");
}

// ============================================================================
// FORM CONFIG OPERATIONS
// ============================================================================

/**
 * Create a new form
 */
export async function createForm(
  data: Omit<FormConfig, "id" | "createdAt" | "updatedAt">
): Promise<FormConfig> {
  await ensureFormIndexes();
  const collection = await getFormsCollection();

  const now = new Date();
  const form: FormConfigDocument = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(form);

  return {
    id: result.insertedId.toString(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get form by ID
 */
export async function getFormById(formId: string): Promise<FormConfig | null> {
  await ensureFormIndexes();
  const collection = await getFormsCollection();

  let doc: FormConfigDocument | null = null;

  // Try ObjectId first
  if (ObjectId.isValid(formId)) {
    doc = await collection.findOne({ _id: new ObjectId(formId) });
  }

  if (!doc) return null;

  return {
    id: doc._id!.toString(),
    accountId: doc.accountId,
    title: doc.title,
    description: doc.description,
    fields: doc.fields,
    submitText: doc.submitText,
    successMessage: doc.successMessage,
    redirectUrl: doc.redirectUrl,
    styling: doc.styling,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Get forms by account
 */
export async function getFormsByAccount(
  accountId: string,
  activeOnly = true
): Promise<FormConfig[]> {
  await ensureFormIndexes();
  const collection = await getFormsCollection();

  const query: Record<string, unknown> = { accountId };
  if (activeOnly) {
    query.isActive = true;
  }

  const docs = await collection.find(query).sort({ createdAt: -1 }).toArray();

  return docs.map((doc) => ({
    id: doc._id!.toString(),
    accountId: doc.accountId,
    title: doc.title,
    description: doc.description,
    fields: doc.fields,
    submitText: doc.submitText,
    successMessage: doc.successMessage,
    redirectUrl: doc.redirectUrl,
    styling: doc.styling,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

/**
 * Update a form
 */
export async function updateForm(
  formId: string,
  updates: Partial<Omit<FormConfig, "id" | "accountId" | "createdAt">>
): Promise<FormConfig | null> {
  await ensureFormIndexes();
  const collection = await getFormsCollection();

  if (!ObjectId.isValid(formId)) return null;

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(formId) },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) return null;

  return {
    id: result._id!.toString(),
    accountId: result.accountId,
    title: result.title,
    description: result.description,
    fields: result.fields,
    submitText: result.submitText,
    successMessage: result.successMessage,
    redirectUrl: result.redirectUrl,
    styling: result.styling,
    isActive: result.isActive,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

/**
 * Delete a form (soft delete)
 */
export async function deleteForm(formId: string): Promise<boolean> {
  await ensureFormIndexes();
  const collection = await getFormsCollection();

  if (!ObjectId.isValid(formId)) return false;

  const result = await collection.updateOne(
    { _id: new ObjectId(formId) },
    { $set: { isActive: false, updatedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

// ============================================================================
// FORM SUBMISSION OPERATIONS
// ============================================================================

/**
 * Create a form submission
 */
export async function createFormSubmission(
  data: Omit<FormSubmission, "id" | "submittedAt">
): Promise<FormSubmission> {
  await ensureFormIndexes();
  const collection = await getSubmissionsCollection();

  const now = new Date();
  const submission: FormSubmissionDocument = {
    ...data,
    submittedAt: now,
  };

  const result = await collection.insertOne(submission);

  return {
    id: result.insertedId.toString(),
    ...data,
    submittedAt: now,
  };
}

/**
 * Get submissions for a form
 */
export async function getFormSubmissions(
  formId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<FormSubmission[]> {
  await ensureFormIndexes();
  const collection = await getSubmissionsCollection();

  const query: Record<string, unknown> = { formId };

  if (options?.startDate || options?.endDate) {
    query.submittedAt = {};
    if (options.startDate) {
      (query.submittedAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.submittedAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  const docs = await collection
    .find(query)
    .sort({ submittedAt: -1 })
    .limit(options?.limit || 100)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id!.toString(),
    formId: doc.formId,
    accountId: doc.accountId,
    data: doc.data,
    utm: doc.utm,
    sessionId: doc.sessionId,
    referrer: doc.referrer,
    url: doc.url,
    userAgent: doc.userAgent,
    submittedAt: doc.submittedAt,
    outcomeId: doc.outcomeId,
  }));
}

/**
 * Get submissions by account
 */
export async function getSubmissionsByAccount(
  accountId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<FormSubmission[]> {
  await ensureFormIndexes();
  const collection = await getSubmissionsCollection();

  const query: Record<string, unknown> = { accountId };

  if (options?.startDate || options?.endDate) {
    query.submittedAt = {};
    if (options.startDate) {
      (query.submittedAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.submittedAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  const docs = await collection
    .find(query)
    .sort({ submittedAt: -1 })
    .limit(options?.limit || 100)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id!.toString(),
    formId: doc.formId,
    accountId: doc.accountId,
    data: doc.data,
    utm: doc.utm,
    sessionId: doc.sessionId,
    referrer: doc.referrer,
    url: doc.url,
    userAgent: doc.userAgent,
    submittedAt: doc.submittedAt,
    outcomeId: doc.outcomeId,
  }));
}

/**
 * Link submission to outcome
 */
export async function linkSubmissionToOutcome(
  submissionId: string,
  outcomeId: string
): Promise<boolean> {
  const collection = await getSubmissionsCollection();

  if (!ObjectId.isValid(submissionId)) return false;

  const result = await collection.updateOne(
    { _id: new ObjectId(submissionId) },
    { $set: { outcomeId } }
  );

  return result.modifiedCount > 0;
}
