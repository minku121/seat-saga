import { NextRequest, NextResponse } from "next/server";
import { INVENTORY_SERVICE_URL } from "@/lib/services";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params;
  const subpath = path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";

  // Forward to Inventory Service /api/seat/{subpath}
  const targetUrl = subpath
    ? `${INVENTORY_SERVICE_URL}/api/seat/${subpath}${queryString}`
    : `${INVENTORY_SERVICE_URL}/api/seat${queryString}`;

  const headers = new Headers();

  // Forward Authorization Bearer token (or cookie fallback)
  let authHeader = request.headers.get("authorization");
  if (!authHeader) {
    const cookieToken = request.cookies.get("token")?.value;
    if (cookieToken) {
      authHeader = `Bearer ${cookieToken}`;
    }
  }
  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  // Forward X-User-Id header if provided
  const xUserId = request.headers.get("x-user-id");
  if (xUserId) {
    headers.set("x-user-id", xUserId);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  } else if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("content-type", "application/json");
  }

  headers.set("accept", "application/json");

  const method = request.method;
  let body: BodyInit | undefined = undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.text();
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseData = await upstreamRes.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamContentType = upstreamRes.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

    return new NextResponse(responseData, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json(
      { error: `Failed to reach inventory service (${targetUrl}): ${errorMsg}` },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

