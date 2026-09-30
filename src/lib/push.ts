import "server-only"
import webpush from "web-push"
import { createHash } from "node:crypto"
import { dailyTransaction } from "./daily-store"
import { claimReminder, type Subscription } from "./daily-model"

export function pushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  )
}
export function validateSubscription(input: unknown): Subscription {
  if (!input || typeof input !== "object")
    throw new Error("Invalid subscription.")
  const x = input as Subscription
  const url = new URL(x.endpoint)
  const allowed =
    url.hostname === "fcm.googleapis.com" ||
    url.hostname === "updates.push.services.mozilla.com" ||
    url.hostname.endsWith(".push.apple.com") ||
    url.hostname.endsWith(".notify.windows.com")
  if (
    !allowed ||
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    x.endpoint.length > 2048
  )
    throw new Error("Unsupported push service endpoint.")
  if (
    !x.keys ||
    !/^[\w-]+$/.test(x.keys.p256dh) ||
    !/^[\w-]+$/.test(x.keys.auth) ||
    Buffer.from(x.keys.p256dh, "base64url").length !== 65 ||
    Buffer.from(x.keys.auth, "base64url").length !== 16
  )
    throw new Error("Invalid push keys.")
  return {
    endpoint: x.endpoint,
    keys: { p256dh: x.keys.p256dh, auth: x.keys.auth },
    owner: "owner",
    createdAt: new Date().toISOString(),
  }
}
export async function sendPush(
  subscription: Subscription,
  payload: { title: string; body: string; tag: string },
) {
  if (!pushConfigured())
    throw new Error("Push keys are not configured on the server.")
  return webpush.sendNotification(
    subscription,
    JSON.stringify({ ...payload, url: "/today" }),
    {
      TTL: 3600,
      timeout: 10000,
      vapidDetails: {
        subject: process.env.VAPID_SUBJECT!,
        publicKey: process.env.VAPID_PUBLIC_KEY!,
        privateKey: process.env.VAPID_PRIVATE_KEY!,
      },
    },
  )
}
export async function morningJob(now = new Date()) {
  if (!pushConfigured()) throw new Error("Configure VAPID keys first.")
  const claims = await dailyTransaction((daily, today) => {
    daily.schedulerLastSeen = now.toISOString()
    const count = Object.values(daily.occurrences).filter(
      (r) => r.date === today && r.status === "pending",
    ).length
    return daily.subscriptions.flatMap((sub) => {
      const id = createHash("sha256").update(sub.endpoint).digest("hex")
      const key = claimReminder(daily, id, now)
      return key ? [{ sub, key, date: today, count }] : []
    })
  }, now)
  let sent = 0
  for (const claim of claims) {
    try {
      await sendPush(claim.sub, {
        title: "Your checklist is ready",
        body: `${claim.count} tasks today. Take them one at a time.`,
        tag: `morning-${claim.date}`,
      })
      await dailyTransaction((daily) => {
        daily.deliveries[claim.key] = { state: "sent", at: now.toISOString() }
      })
      sent++
    } catch (error) {
      const code = (error as { statusCode?: number }).statusCode
      await dailyTransaction((daily) => {
        daily.deliveries[claim.key] = {
          state: "failed",
          at: now.toISOString(),
          detail: code
            ? `Push service returned ${code}`
            : "Delivery unconfirmed. Not retried to prevent duplicates.",
        }
        if (code === 404 || code === 410)
          daily.subscriptions = daily.subscriptions.filter(
            (s) => s.endpoint !== claim.sub.endpoint,
          )
      })
    }
  }
  return { attempted: claims.length, sent }
}
