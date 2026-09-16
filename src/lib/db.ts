// Database helpers
import { Db } from "mongodb";
import clientPromise from "./mongodb/clientPromise";

const DB_NAME = "strategy";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export { clientPromise };
