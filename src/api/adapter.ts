/**
 * Next.js App Router ↔ Framework-Agnostic Handler Adapter
 *
 * Converts Next.js 15 NextRequest/NextResponse to and from the plain
 * ApiRequest/ApiResponse types used by all handler functions.
 *
 * No secrets here; auth is validated via validateAuth stub.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "./middleware/auth";
import type { ApiRequest, ApiResponse } from "./routes/uploads";

interface ToApiRequestOptions {
  /** Path params (already awaited by the calling route) */
  params?: Record<string, string>;
  /** When true, a missing/invalid token returns the 401 errorResponse */
  requireAuth?: boolean;
}

/**
 * Build an ApiRequest from a Next.js NextRequest.
 *
 * Returns either an ApiRequest ready for the handler, or an ApiResponse
 * representing the 401 that should be returned immediately (when auth fails
 * and requireAuth is true).
 */
export async function toApiRequest(
  req: NextRequest,
  options: ToApiRequestOptions = {}
): Promise<ApiRequest | ApiResponse> {
  const { params = {}, requireAuth = true } = options;

  // --- Auth ---
  const authHeader = req.headers.get("authorization") ?? undefined;
  const authResult = validateAuth(authHeader);

  if (requireAuth && !authResult.authenticated) {
    return authResult.errorResponse as ApiResponse;
  }

  // If not authenticated but auth not required, use an empty accountId.
  const accountId = authResult.accountId ?? "";

  // --- Body ---
  const contentType = req.headers.get("content-type") ?? "";

  let body: Record<string, unknown> = {};
  let file: ApiRequest["file"] | undefined;

  if (contentType.includes("application/json")) {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuf = await value.arrayBuffer();
        file = {
          buffer: Buffer.from(arrayBuf),
          originalname: value.name,
          size: value.size,
          mimetype: value.type || "application/octet-stream",
        };
      } else {
        body[key] = value;
      }
    }
  }

  return { accountId, body, params, file };
}

/**
 * Convert a framework-agnostic ApiResponse into a NextResponse.
 */
export function toNextResponse(apiResponse: ApiResponse): NextResponse {
  return NextResponse.json(apiResponse.body, { status: apiResponse.status });
}

/**
 * Type guard: did toApiRequest return a 401 error response?
 */
export function isErrorResponse(
  result: ApiRequest | ApiResponse
): result is ApiResponse {
  return "status" in result && "body" in result && !("accountId" in result);
}
