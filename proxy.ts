import { NextResponse, type NextRequest } from "next/server";

/** Pass the requested path to server components so login can send people back where they were. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon|icon|manifest|robots|sitemap).*)"],
};
