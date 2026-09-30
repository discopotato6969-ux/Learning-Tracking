import { NextResponse, type NextRequest } from "next/server"

import { isValidSessionToken, sessionCookieName } from "@/lib/auth"
const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/jobs/morning", "/manifest.webmanifest", "/sw.js", "/offline.html", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (publicPaths.includes(pathname) || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  if (isValidSessionToken(request.cookies.get(sessionCookieName)?.value)) {
    const response = NextResponse.next()
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401 })

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!api/progress).*)", "/api/progress"],
}
