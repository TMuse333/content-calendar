/**
 * Deal Types
 *
 * A Deal represents a content package for a client (e.g., "Oct 2026 Package").
 * Content items belong to deals for tracking progress against limits.
 */

import { ObjectId } from "mongodb";

export type DealStatus = "active" | "completed" | "paused";

export interface DealLimits {
  carousels?: number | "bonus";
  graphics?: number | "bonus";
  videos?: number | "bonus";
}

export interface DealProgress {
  carousels: { done: number; total: number | "bonus" };
  graphics: { done: number; total: number | "bonus" };
  videos: { done: number; total: number | "bonus" };
}

export interface Deal {
  _id?: ObjectId;
  id: string;                    // Unique slug (e.g., "greg-oct-2026")
  accountId: string;             // Parent account
  name: string;                  // Display name (e.g., "Oct 2026 Package")
  status: DealStatus;
  limits: DealLimits;

  // Optional metadata
  startDate?: Date;
  endDate?: Date;
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDealRequest {
  id?: string;
  name: string;
  status?: DealStatus;
  limits: DealLimits;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateDealRequest {
  name?: string;
  status?: DealStatus;
  limits?: Partial<DealLimits>;
  startDate?: string;
  endDate?: string;
  notes?: string;
}
