/**
 * Integration Store — Env-Gated Factory
 *
 * Selects between the real Supabase clients and the in-memory stubs based on
 * the presence of `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment
 * variables at module initialisation time.
 *
 * - With both env vars set  → real Supabase clients (production / staging)
 * - With either env var absent → in-memory stubs (local dev, CI, tests)
 *
 * This module is server-side only. Never import from "use client" files.
 *
 * Static imports of both modules are intentional: we import both at the top
 * level so TypeScript can check the real client at build time. The singleton
 * in supabase.stub.ts is initialised lazily on first access (globalThis guard),
 * so importing the stub module when Supabase is active is harmless.
 *
 * Re-exports shared types so callers only need one import location.
 */

export type { IDatabaseClient, IStorageClient, StoredUpload, StoredReport } from "./supabase.stub";

import type { IDatabaseClient, IStorageClient } from "./supabase.stub";

// Static imports — TypeScript checks both at build time.
// The real client is imported here but only instantiated when env vars are set.
import { databaseClient as stubDb, storageClient as stubStorage } from "./supabase.stub";
import { RealDatabaseClient, RealStorageClient } from "./supabase.real";

function makeClients(): { databaseClient: IDatabaseClient; storageClient: IStorageClient } {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Real Supabase — credentials present. The Supabase client is initialised
    // lazily inside RealDatabaseClient/RealStorageClient methods (getClient()),
    // so constructing the instances here is safe even without credentials.
    return {
      databaseClient: new RealDatabaseClient(),
      storageClient: new RealStorageClient(),
    };
  }

  // Fall back to in-memory stubs — safe for local dev and CI without credentials.
  // The globalThis singleton in supabase.stub.ts keeps state consistent across
  // Next.js route bundles within a single warm Node process.
  return {
    databaseClient: stubDb,
    storageClient: stubStorage,
  };
}

const clients = makeClients();

export const databaseClient: IDatabaseClient = clients.databaseClient;
export const storageClient: IStorageClient = clients.storageClient;
