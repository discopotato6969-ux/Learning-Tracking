import { NextResponse } from "next/server"

import {
  createSessionToken,
  isValidPassword,
  isValidUsername,
  sessionCookieName,
  sessionMaxAge,
} from "@/lib/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const username = typeof body?.username === "string" ? body.username : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!isValidUsername(username) || !isValidPassword(password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(sessionCookieName, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  })
  return response
}
