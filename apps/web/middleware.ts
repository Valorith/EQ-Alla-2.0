import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveLegacyRoute } from "@eq-alla/data/legacy-routes";

export function middleware(request: NextRequest) {
  const target = resolveLegacyRoute(request.nextUrl.pathname, request.nextUrl.searchParams);

  if (target) {
    return NextResponse.redirect(new URL(target, request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/task.php", "/spawngroup.php"]
};

