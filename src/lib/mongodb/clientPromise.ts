// MongoDB client promise with proper caching for Next.js
import { MongoClient } from "mongodb";

const options = {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  retryReads: true,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }

  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    // In development, use a global variable to preserve connection across HMR
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production, create a new client
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

// Export as a getter to defer initialization
export default {
  then: <T>(
    onfulfilled?: (value: MongoClient) => T | PromiseLike<T>,
    onrejected?: (reason: unknown) => T | PromiseLike<T>
  ) => getClientPromise().then(onfulfilled, onrejected),
  catch: <T>(onrejected?: (reason: unknown) => T | PromiseLike<T>) =>
    getClientPromise().catch(onrejected),
} as Promise<MongoClient>;

export { getClientPromise };
