/**
 * Packages Collection
 *
 * CRUD operations for Video Packages.
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type {
  VideoPackage,
  Episode,
  CreatePackageRequest,
  UpdatePackageRequest,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  computePackageStatus,
} from "../types/package";
import { v4 as uuidv4 } from "uuid";

const DB_NAME = "strategy";
const COLLECTION_NAME = "packages";

/**
 * Get the packages collection
 */
async function getCollection(): Promise<Collection<VideoPackage>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<VideoPackage>(COLLECTION_NAME);
}

/**
 * Get all packages for an account
 */
export async function getPackages(accountId: string): Promise<VideoPackage[]> {
  const collection = await getCollection();
  return collection.find({ accountId }).sort({ createdAt: -1 }).toArray();
}

/**
 * Get a package by ID
 */
export async function getPackageById(
  packageId: string
): Promise<VideoPackage | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(packageId) });
}

/**
 * Get a package by name (for an account)
 */
export async function getPackageByName(
  accountId: string,
  name: string
): Promise<VideoPackage | null> {
  const collection = await getCollection();
  return collection.findOne({ accountId, name });
}

/**
 * Create a new package
 */
export async function createPackage(
  accountId: string,
  data: CreatePackageRequest
): Promise<string> {
  const collection = await getCollection();
  const now = new Date();

  // Process episodes if provided
  const episodes: Episode[] = (data.episodes || []).map((ep, index) => ({
    id: uuidv4(),
    number: ep.number ?? index + 1,
    title: ep.title,
    status: ep.status || "planned",
    about: ep.about,
    informationTransmitted: ep.informationTransmitted,
    notes: ep.notes,
    script: ep.script,
    createdAt: now,
    updatedAt: now,
  }));

  const pkg: VideoPackage = {
    accountId,
    name: data.name,
    description: data.description,
    goal: data.goal,
    context: data.context,
    informationTransmitted: data.informationTransmitted,
    episodes,
    status: "planning",
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(pkg);
  return result.insertedId.toString();
}

/**
 * Update a package
 */
export async function updatePackage(
  packageId: string,
  updates: UpdatePackageRequest
): Promise<boolean> {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(packageId) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete a package
 */
export async function deletePackage(packageId: string): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(packageId) });
  return result.deletedCount > 0;
}

/**
 * Add an episode to a package
 */
export async function addEpisode(
  packageId: string,
  data: CreateEpisodeRequest
): Promise<string> {
  const collection = await getCollection();
  const now = new Date();

  const episode: Episode = {
    id: uuidv4(),
    number: data.number,
    title: data.title,
    status: "planned",
    about: data.about,
    informationTransmitted: data.informationTransmitted,
    notes: data.notes,
    script: data.script,
    createdAt: now,
    updatedAt: now,
  };

  await collection.updateOne(
    { _id: new ObjectId(packageId) },
    {
      $push: { episodes: episode },
      $set: { updatedAt: now },
    }
  );

  return episode.id;
}

/**
 * Update an episode within a package
 */
export async function updateEpisode(
  packageId: string,
  episodeId: string,
  updates: UpdateEpisodeRequest
): Promise<boolean> {
  const collection = await getCollection();
  const now = new Date();

  // Build the update object for nested episode
  const setObj: Record<string, unknown> = {
    "episodes.$.updatedAt": now,
    updatedAt: now,
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setObj[`episodes.$.${key}`] = value;
    }
  }

  const result = await collection.updateOne(
    {
      _id: new ObjectId(packageId),
      "episodes.id": episodeId,
    },
    { $set: setObj }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete an episode from a package
 */
export async function deleteEpisode(
  packageId: string,
  episodeId: string
): Promise<boolean> {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(packageId) },
    {
      $pull: { episodes: { id: episodeId } },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Get an episode by ID
 */
export async function getEpisode(
  packageId: string,
  episodeId: string
): Promise<Episode | null> {
  const pkg = await getPackageById(packageId);
  if (!pkg) return null;
  return pkg.episodes.find((e) => e.id === episodeId) || null;
}

/**
 * Update package status based on episode statuses
 */
export async function refreshPackageStatus(packageId: string): Promise<void> {
  const collection = await getCollection();
  const pkg = await getPackageById(packageId);

  if (!pkg) return;

  // Import the helper function
  const { computePackageStatus } = await import("../types/package");
  const newStatus = computePackageStatus(pkg.episodes);

  if (newStatus !== pkg.status) {
    await collection.updateOne(
      { _id: new ObjectId(packageId) },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );
  }
}
