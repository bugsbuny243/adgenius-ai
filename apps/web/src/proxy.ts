import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isProtected = request.nextUrl.pathname.startsWith("/workspace");

  if (!isProtected) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*"]
};
