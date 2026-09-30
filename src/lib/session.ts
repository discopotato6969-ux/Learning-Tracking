import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isValidSessionToken, sessionCookieName } from "./auth"

export async function hasSession() {
  return isValidSessionToken((await cookies()).get(sessionCookieName)?.value)
}
export async function requireSession() {
  if (!(await hasSession())) redirect("/login")
}
export async function authorize(request?: Request) {
  if (!(await hasSession()))
    return Response.json({ error: "Please sign in again." }, { status: 401 })
  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin")
    const expected = process.env.APP_ORIGIN || new URL(request.url).origin
    if (
      (origin && origin !== expected) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return Response.json({ error: "Invalid origin." }, { status: 403 })
  }
}
