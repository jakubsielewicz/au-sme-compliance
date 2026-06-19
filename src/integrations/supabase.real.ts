/**
 * Supabase Integration — Real Implementation
 *
 * Server-side only. Initialised with the service-role key so it bypasses
 * Supabase RLS. Tenant isolation is enforced at the API layer via the
 * `accountId` parameter on every query (RLS is defense-in-depth for Phase 4b
 * when requests arrive with a user JWT).
 *
 * This module MUST NOT be imported from client-side ("use client") files.
 * The service-role key must stay server-side only (NFR-S3).
 *
 * No credentials are hardcoded — all secrets come from environment variables.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  IDatabaseClient,
  IStorageClient,
  StoredUpload,
  StoredReport,
} from "./supabase.stub";

// ---------------------------------------------------------------------------
// Singleton client (lazy-initialised)
// ---------------------------------------------------------------------------

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the real Supabase client."
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ---------------------------------------------------------------------------
// Column mapping helpers
// ---------------------------------------------------------------------------

/** Map a DB uploads row → StoredUpload */
function rowToUpload(row: Record<string, unknown>): StoredUpload {
  return {
    uploadId: row["id"] as string,
    accountId: row["account_id"] as string,
    filename: row["filename_original"] as string,
    storagePathEncrypted: row["storage_path"] as string,
    rowCount: (row["row_count"] as number) ?? 0,
    status: row["status"] as StoredUpload["status"],
    awardCode: row["award_code"] as string,
    uploadedAt: row["uploaded_at"] as string,
    purgeAt: row["purge_at"] as string,
  };
}

/** Map a DB reports row → StoredReport */
function rowToReport(row: Record<string, unknown>): StoredReport {
  return {
    reportId: row["id"] as string,
    accountId: row["account_id"] as string,
    uploadId: row["upload_id"] as string,
    storagePathEncrypted: row["storage_path"] as string,
    generatedAt: row["generated_at"] as string,
    rateTableEffectiveDate: row["rate_table_effective_date"] as string,
    employeeCountChecked: (row["employee_count_checked"] as number) ?? 0,
    employeeCountGaps: (row["employee_count_gaps"] as number) ?? 0,
    totalGapWeeklyAud: parseFloat(String(row["total_gap_weekly_aud"] ?? "0")),
    disclaimerVersion: row["disclaimer_version"] as string,
    purgeAt: row["purge_at"] as string,
  };
}

// ---------------------------------------------------------------------------
// RealDatabaseClient
// ---------------------------------------------------------------------------

export class RealDatabaseClient implements IDatabaseClient {
  async insertUpload(upload: Omit<StoredUpload, "uploadId">): Promise<string> {
    const client = getClient();
    const { data, error } = await client
      .from("uploads")
      .insert({
        account_id: upload.accountId,
        filename_original: upload.filename,
        storage_path: upload.storagePathEncrypted,
        row_count: upload.rowCount,
        status: upload.status,
        award_code: upload.awardCode,
        uploaded_at: upload.uploadedAt,
        purge_at: upload.purgeAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Supabase insertUpload failed: ${error?.message ?? "no data returned"}`);
    }
    return (data as Record<string, unknown>)["id"] as string;
  }

  async updateUploadStatus(uploadId: string, status: StoredUpload["status"]): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from("uploads")
      .update({ status })
      .eq("id", uploadId);

    if (error) {
      throw new Error(`Supabase updateUploadStatus failed: ${error.message}`);
    }
  }

  async getUpload(uploadId: string, accountId: string): Promise<StoredUpload | null> {
    const client = getClient();
    const { data, error } = await client
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getUpload failed: ${error.message}`);
    }
    if (!data) return null;
    return rowToUpload(data as Record<string, unknown>);
  }

  async listUploads(accountId: string): Promise<StoredUpload[]> {
    const client = getClient();
    const { data, error } = await client
      .from("uploads")
      .select("*")
      .eq("account_id", accountId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase listUploads failed: ${error.message}`);
    }
    return ((data ?? []) as Record<string, unknown>[]).map(rowToUpload);
  }

  async insertReport(report: Omit<StoredReport, "reportId">): Promise<string> {
    const client = getClient();
    const { data, error } = await client
      .from("reports")
      .insert({
        account_id: report.accountId,
        upload_id: report.uploadId,
        storage_path: report.storagePathEncrypted,
        generated_at: report.generatedAt,
        rate_table_effective_date: report.rateTableEffectiveDate,
        employee_count_checked: report.employeeCountChecked,
        employee_count_gaps: report.employeeCountGaps,
        total_gap_weekly_aud: report.totalGapWeeklyAud,
        disclaimer_version: report.disclaimerVersion,
        purge_at: report.purgeAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Supabase insertReport failed: ${error?.message ?? "no data returned"}`);
    }
    return (data as Record<string, unknown>)["id"] as string;
  }

  async getReport(reportId: string, accountId: string): Promise<StoredReport | null> {
    const client = getClient();
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getReport failed: ${error.message}`);
    }
    if (!data) return null;
    return rowToReport(data as Record<string, unknown>);
  }

  async listReports(accountId: string): Promise<StoredReport[]> {
    const client = getClient();
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("account_id", accountId)
      .order("generated_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase listReports failed: ${error.message}`);
    }
    return ((data ?? []) as Record<string, unknown>[]).map(rowToReport);
  }
}

// ---------------------------------------------------------------------------
// RealStorageClient
// ---------------------------------------------------------------------------

/**
 * Parse a combined storage path of the form `<bucket>/<rest-of-path>`.
 * Returns { bucket, path } where path is everything after the first "/".
 */
function parseBucketPath(storagePath: string): { bucket: string; path: string } {
  const idx = storagePath.indexOf("/");
  if (idx === -1) {
    throw new Error(`Invalid storage path (no bucket separator): ${storagePath}`);
  }
  return {
    bucket: storagePath.slice(0, idx),
    path: storagePath.slice(idx + 1),
  };
}

export class RealStorageClient implements IStorageClient {
  async storeFile(bucket: string, path: string, content: Buffer): Promise<string> {
    const client = getClient();
    const { error } = await client.storage
      .from(bucket)
      .upload(path, content, { upsert: true });

    if (error) {
      throw new Error(`Supabase storeFile failed (${bucket}/${path}): ${error.message}`);
    }
    return `${bucket}/${path}`;
  }

  async getFile(storagePath: string): Promise<Buffer> {
    const client = getClient();
    const { bucket, path } = parseBucketPath(storagePath);
    const { data, error } = await client.storage.from(bucket).download(path);

    if (error || !data) {
      throw new Error(`Supabase getFile failed (${storagePath}): ${error?.message ?? "no data"}`);
    }
    // data is a Blob in browser; in Node/Edge it is also Blob-like — convert via arrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number): Promise<string> {
    const client = getClient();
    const { bucket, path } = parseBucketPath(storagePath);
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Supabase getSignedUrl failed (${storagePath}): ${error?.message ?? "no data"}`);
    }
    return data.signedUrl;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const client = getClient();
    const { bucket, path } = parseBucketPath(storagePath);
    const { error } = await client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Supabase deleteFile failed (${storagePath}): ${error.message}`);
    }
  }
}
