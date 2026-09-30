import { createHmac, timingSafeEqual } from "node:crypto"

export const sessionCookieName = "learning_hub_session"
export const sessionMaxAge = 60 * 60 * 24 * 30

function getAuthSecret() {
  const secret = process.env.LEARNING_HUB_SESSION_SECRET

  if (!secret) {
    throw new Error("LEARNING_HUB_SESSION_SECRET is not configured")
  }

  return secret
}

export function isValidUsername(username: string) {
  return username.trim().toLowerCase() === (process.env.LEARNING_HUB_USERNAME ?? "").trim().toLowerCase()
}

export function isValidPassword(password: string) {
  const expected = Buffer.from(process.env.LEARNING_HUB_PASSWORD ?? "")
  const received = Buffer.from(password)
  return expected.length > 0 && expected.length === received.length && timingSafeEqual(expected, received)
}

export function createSessionToken() {
  const payload = `owner:${Math.floor(Date.now() / 1000) + sessionMaxAge}`
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("hex")
  return `${payload}.${signature}`
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false

  const parts = token.split(".")
  if (parts.length !== 2 || !/^owner:\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false
  const expires = Number(parts[0].split(":")[1])
  if (expires <= Date.now() / 1000 || expires > Date.now() / 1000 + sessionMaxAge + 60) return false
  const expected = `${parts[0]}.${createHmac("sha256", getAuthSecret()).update(parts[0]).digest("hex")}`
  const receivedBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}
