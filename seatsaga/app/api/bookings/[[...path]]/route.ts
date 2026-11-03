import { NextRequest, NextResponse } from "next/server";
import { BOOKING_SERVICE_URL } from "@/lib/services";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params;
  const subpath = path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";

  const targetUrl = subpath
    ? `${BOOKING_SERVICE_URL}/api/bookings/${subpath}${queryString}`
    : `${BOOKING_SERVICE_URL}/api/bookings${queryString}`;

  const headers = new Headers();

  // Forward incoming Authorization header, or fall back to HTTP-only/cookie token
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
      { error: `Failed to reach booking service (${targetUrl}): ${errorMsg}` },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
