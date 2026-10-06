/**
 * Graphic Packages MongoDB Operations
 *
 * CRUD for packages, questions, scheduled carousels, usage, and reviews.
 * Packages belong to Accounts (using accountId).
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type {
  GraphicPackage,
  QuestionBankItem,
  ScheduledCarousel,
  MonthlyReview,
  AnnouncementUsage,
  CreateGraphicPackageRequest,
  CreateQuestionRequest,
  ScheduleCarouselRequest,
  LogAnnouncementRequest,
  CreateReviewRequest,
} from "../types/graphic-package";
import { randomUUID } from "crypto";

const DB_NAME = "strategy";

// Collection names
const PACKAGES = "graphic_packages";
const QUESTIONS = "graphic_questions";
const SCHEDULED = "graphic_scheduled";
const USAGE = "graphic_usage";
const REVIEWS = "graphic_reviews";

// Index tracking
let indexesEnsured = false;

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

async function ensureIndexes() {
  if (indexesEnsured) return;
  const db = await getDb();

  await Promise.all([
    db.collection(PACKAGES).createIndex({ id: 1 }, { unique: true }),
    db.collection(PACKAGES).createIndex({ accountId: 1 }),
    db.collection(QUESTIONS).createIndex({ packageId: 1 }),
    db.collection(SCHEDULED).createIndex({ packageId: 1, scheduledDate: 1 }),
    db.collection(USAGE).createIndex({ packageId: 1, createdAt: -1 }),
    db.collection(REVIEWS).createIndex({ packageId: 1, month: -1 }),
  ]);

  indexesEnsured = true;
}

// ============ PACKAGES ============

export async function getGraphicPackages(accountId?: string): Promise<GraphicPackage[]> {
  await ensureIndexes();
  const db = await getDb();
  const query = accountId ? { accountId } : {};
  return db.collection<GraphicPackage>(PACKAGES).find(query).sort({ createdAt: -1 }).toArray();
}

export async function getGraphicPackageById(id: string): Promise<GraphicPackage | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<GraphicPackage>(PACKAGES).findOne({ id });
}

export async function createGraphicPackage(data: CreateGraphicPackageRequest): Promise<GraphicPackage> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();

  const pkg: GraphicPackage = {
    id: randomUUID(),
    accountId: data.accountId,
    name: data.name,
    type: data.type,
    status: "active",
    allocation: data.allocation,
    used: data.type === "announcements" ? 0 : undefined,
    price: data.price,
    monthlyFrequency: data.monthlyFrequency,
    monthlyRate: data.monthlyRate,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<GraphicPackage>(PACKAGES).insertOne(pkg);
  return pkg;
}

export async function updateGraphicPackage(
  id: string,
  updates: Partial<Omit<GraphicPackage, "_id" | "id" | "accountId" | "createdAt">>
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<GraphicPackage>(PACKAGES).updateOne(
    { id },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function incrementUsage(packageId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<GraphicPackage>(PACKAGES).updateOne(
    { id: packageId, type: "announcements" },
    { $inc: { used: 1 }, $set: { updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function topUpPackage(packageId: string, additional: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<GraphicPackage>(PACKAGES).updateOne(
    { id: packageId, type: "announcements" },
    { $inc: { allocation: additional }, $set: { updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

// ============ QUESTIONS ============

export async function getQuestions(packageId: string): Promise<QuestionBankItem[]> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<QuestionBankItem>(QUESTIONS)
    .find({ packageId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getQuestionById(id: string): Promise<QuestionBankItem | null> {
  const db = await getDb();
  return db.collection<QuestionBankItem>(QUESTIONS).findOne({ id });
}

export async function createQuestion(
  packageId: string,
  data: CreateQuestionRequest
): Promise<QuestionBankItem> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();

  const question: QuestionBankItem = {
    id: randomUUID(),
    packageId,
    question: data.question,
    category: data.category,
    status: "unused",
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<QuestionBankItem>(QUESTIONS).insertOne(question);
  return question;
}

export async function updateQuestion(
  id: string,
  updates: Partial<Omit<QuestionBankItem, "_id" | "id" | "packageId" | "createdAt">>
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<QuestionBankItem>(QUESTIONS).updateOne(
    { id },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<QuestionBankItem>(QUESTIONS).deleteOne({ id });
  return result.deletedCount > 0;
}

// ============ SCHEDULED CAROUSELS ============

export async function getScheduledCarousels(
  packageId: string,
  options?: { month?: string; status?: string }
): Promise<ScheduledCarousel[]> {
  await ensureIndexes();
  const db = await getDb();

  const query: Record<string, unknown> = { packageId };

  if (options?.month) {
    const [year, month] = options.month.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    query.scheduledDate = { $gte: start, $lte: end };
  }

  if (options?.status) {
    query.status = options.status;
  }

  return db.collection<ScheduledCarousel>(SCHEDULED)
    .find(query)
    .sort({ scheduledDate: 1 })
    .toArray();
}

export async function getUpcomingCarousels(packageId: string, limit: number = 10): Promise<ScheduledCarousel[]> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<ScheduledCarousel>(SCHEDULED)
    .find({ packageId, scheduledDate: { $gte: new Date() }, status: { $ne: "published" } })
    .sort({ scheduledDate: 1 })
    .limit(limit)
    .toArray();
}

export async function getScheduledCarouselById(id: string): Promise<ScheduledCarousel | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<ScheduledCarousel>(SCHEDULED).findOne({ id });
}

export async function scheduleCarousel(
  packageId: string,
  data: ScheduleCarouselRequest
): Promise<ScheduledCarousel> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();

  // Get question for denormalization
  const question = await getQuestionById(data.questionId);

  const scheduled: ScheduledCarousel = {
    id: randomUUID(),
    packageId,
    questionId: data.questionId,
    question: question?.question,
    scheduledDate: new Date(data.scheduledDate),
    status: "draft",
    notes: data.notes,
    // Entropy fields
    level: data.level,
    uncertaintyAddressed: data.uncertaintyAddressed,
    suggestedFormat: data.suggestedFormat,
    isEvergreen: data.isEvergreen,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<ScheduledCarousel>(SCHEDULED).insertOne(scheduled);

  // Update question status
  if (question) {
    await updateQuestion(data.questionId, {
      status: "scheduled",
      scheduledCarouselId: scheduled.id,
    });
  }

  return scheduled;
}

export async function updateScheduledCarousel(
  id: string,
  updates: Partial<Omit<ScheduledCarousel, "_id" | "id" | "packageId" | "createdAt">>
): Promise<boolean> {
  const db = await getDb();

  // If marking as published, set publishedAt
  if (updates.status === "published" && !updates.publishedAt) {
    updates.publishedAt = new Date();
  }

  const result = await db.collection<ScheduledCarousel>(SCHEDULED).updateOne(
    { id },
    { $set: { ...updates, updatedAt: new Date() } }
  );

  // If published, update the question status too
  if (updates.status === "published") {
    const scheduled = await db.collection<ScheduledCarousel>(SCHEDULED).findOne({ id });
    if (scheduled?.questionId) {
      await updateQuestion(scheduled.questionId, { status: "published" });
    }
  }

  return result.modifiedCount > 0;
}

export async function linkGraphicToCarousel(
  id: string,
  graphicId: string,
  previewUrl?: string,
  graphicUrls?: string[],
  metadata?: {
    format?: string;
    renderedAt?: Date;
    templateId?: string;
    dimensions?: { width: number; height: number };
    slideCount?: number;
  }
): Promise<ScheduledCarousel | null> {
  const db = await getDb();

  const updates: Record<string, unknown> = {
    listingGraphicsProjectId: graphicId,
    graphicUrl: previewUrl,
    status: "ready",
    updatedAt: new Date(),
  };

  if (graphicUrls && graphicUrls.length > 0) {
    updates.graphicUrls = graphicUrls;
  }

  if (metadata?.format) {
    updates.suggestedFormat = metadata.format;
  }

  const result = await db.collection<ScheduledCarousel>(SCHEDULED).findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  return result;
}

export async function approveCarousel(id: string): Promise<ScheduledCarousel | null> {
  const db = await getDb();
  const result = await db.collection<ScheduledCarousel>(SCHEDULED).findOneAndUpdate(
    { id, status: "ready" },
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  // Update question status if published
  if (result?.questionId) {
    await updateQuestion(result.questionId, { status: "published" });
  }

  return result;
}

export async function requestCarouselRevision(
  id: string,
  feedback: string
): Promise<ScheduledCarousel | null> {
  const db = await getDb();
  const result = await db.collection<ScheduledCarousel>(SCHEDULED).findOneAndUpdate(
    { id, status: "ready" },
    {
      $set: {
        status: "draft",
        clientFeedback: feedback,
        updatedAt: new Date(),
      },
      $push: {
        revisionHistory: {
          feedback,
          requestedAt: new Date(),
        },
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteScheduledCarousel(id: string): Promise<boolean> {
  const db = await getDb();

  // Get the scheduled carousel to find the question
  const scheduled = await db.collection<ScheduledCarousel>(SCHEDULED).findOne({ id });

  const result = await db.collection<ScheduledCarousel>(SCHEDULED).deleteOne({ id });

  // Revert question status if it was scheduled
  if (result.deletedCount > 0 && scheduled?.questionId) {
    await updateQuestion(scheduled.questionId, {
      status: "unused",
      scheduledCarouselId: undefined,
    });
  }

  return result.deletedCount > 0;
}

// ============ ANNOUNCEMENT USAGE ============

export async function getUsage(packageId: string): Promise<AnnouncementUsage[]> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<AnnouncementUsage>(USAGE)
    .find({ packageId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function logUsage(
  packageId: string,
  data: LogAnnouncementRequest
): Promise<AnnouncementUsage> {
  await ensureIndexes();
  const db = await getDb();

  const usage: AnnouncementUsage = {
    id: randomUUID(),
    packageId,
    listingAddress: data.listingAddress,
    graphicType: data.graphicType,
    graphicUrl: data.graphicUrl,
    notes: data.notes,
    createdAt: new Date(),
  };

  await db.collection<AnnouncementUsage>(USAGE).insertOne(usage);

  // Increment used count
  await incrementUsage(packageId);

  return usage;
}

export async function deleteUsage(id: string, packageId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<AnnouncementUsage>(USAGE).deleteOne({ id });

  // Decrement used count
  if (result.deletedCount > 0) {
    await db.collection<GraphicPackage>(PACKAGES).updateOne(
      { id: packageId, type: "announcements" },
      { $inc: { used: -1 }, $set: { updatedAt: new Date() } }
    );
  }

  return result.deletedCount > 0;
}

// ============ MONTHLY REVIEWS ============

export async function getReviews(packageId: string): Promise<MonthlyReview[]> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<MonthlyReview>(REVIEWS)
    .find({ packageId })
    .sort({ month: -1 })
    .toArray();
}

export async function getReviewByMonth(packageId: string, month: string): Promise<MonthlyReview | null> {
  const db = await getDb();
  return db.collection<MonthlyReview>(REVIEWS).findOne({ packageId, month });
}

export async function createReview(
  packageId: string,
  data: CreateReviewRequest
): Promise<MonthlyReview> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();

  // Calculate stats for the month
  const carousels = await getScheduledCarousels(packageId, { month: data.month, status: "published" });
  const totalCarousels = carousels.length;

  // Find top performer
  let topPerformer: MonthlyReview["topPerformer"];
  if (carousels.length > 0) {
    const sorted = carousels
      .filter(c => c.performance?.reach)
      .sort((a, b) => (b.performance?.reach || 0) - (a.performance?.reach || 0));

    if (sorted[0]) {
      topPerformer = {
        questionId: sorted[0].questionId,
        question: sorted[0].question || "",
        reach: sorted[0].performance?.reach || 0,
      };
    }
  }

  const review: MonthlyReview = {
    id: randomUUID(),
    packageId,
    month: data.month,
    whatLanded: data.whatLanded,
    whatsNext: data.whatsNext,
    totalCarousels,
    topPerformer,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<MonthlyReview>(REVIEWS).insertOne(review);
  return review;
}

export async function updateReview(
  id: string,
  updates: Partial<Omit<MonthlyReview, "_id" | "id" | "packageId" | "createdAt">>
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<MonthlyReview>(REVIEWS).updateOne(
    { id },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

// ============ ACCOUNT-LEVEL QUERIES ============

export async function getScheduledCarouselsByAccount(
  accountId: string,
  options?: { month?: number; year?: number }
): Promise<(ScheduledCarousel & { packageName?: string })[]> {
  await ensureIndexes();
  const db = await getDb();

  // Get all carousel packages for this account
  const packages = await db.collection<GraphicPackage>(PACKAGES)
    .find({ accountId, type: "carousels" })
    .toArray();

  if (packages.length === 0) return [];

  const packageIds = packages.map(p => p.id);
  const packageMap = new Map(packages.map(p => [p.id, p.name]));

  // Build date range query
  const query: Record<string, unknown> = { packageId: { $in: packageIds } };

  if (options?.month && options?.year) {
    const start = new Date(options.year, options.month - 1, 1);
    const end = new Date(options.year, options.month, 0, 23, 59, 59);
    query.scheduledDate = { $gte: start, $lte: end };
  } else if (options?.year) {
    const start = new Date(options.year, 0, 1);
    const end = new Date(options.year, 11, 31, 23, 59, 59);
    query.scheduledDate = { $gte: start, $lte: end };
  }

  const scheduled = await db.collection<ScheduledCarousel>(SCHEDULED)
    .find(query)
    .sort({ scheduledDate: 1 })
    .toArray();

  // Add package name to each result
  return scheduled.map(s => ({
    ...s,
    packageName: packageMap.get(s.packageId),
  }));
}

// ============ STATS ============

export async function getPackageStats(packageId: string): Promise<{
  questionsTotal: number;
  questionsUsed: number;
  questionsUnused: number;
  upcomingCarousels: number;
  publishedThisMonth: number;
}> {
  const db = await getDb();

  const questions = await db.collection<QuestionBankItem>(QUESTIONS).find({ packageId }).toArray();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const published = await db.collection<ScheduledCarousel>(SCHEDULED).countDocuments({
    packageId,
    status: "published",
    publishedAt: { $gte: monthStart },
  });

  const upcoming = await db.collection<ScheduledCarousel>(SCHEDULED).countDocuments({
    packageId,
    scheduledDate: { $gte: now },
    status: { $ne: "published" },
  });

  return {
    questionsTotal: questions.length,
    questionsUsed: questions.filter(q => q.status === "published").length,
    questionsUnused: questions.filter(q => q.status === "unused").length,
    upcomingCarousels: upcoming,
    publishedThisMonth: published,
  };
}
