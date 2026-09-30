import { authorize } from "@/lib/session"
import { dailyTransaction } from "@/lib/daily-store"
import { sendPush, validateSubscription } from "@/lib/push"

export async function POST(request: Request) {
  const denied = await authorize(request)
  if (denied) return denied
  const text = await request.text()
  if (text.length > 8000)
    return Response.json({ error: "Request too large." }, { status: 413 })
  try {
    const body = JSON.parse(text)
    if (body.action === "status") {
      return Response.json(
        await dailyTransaction((daily) => ({
          registered: daily.subscriptions.some(
            (s) => s.endpoint === body.endpoint,
          ),
        })),
      )
    }
    if (body.action === "subscribe") {
      const sub = validateSubscription(body.subscription)
      await dailyTransaction((daily) => {
        daily.subscriptions = daily.subscriptions.filter(
          (s) => s.endpoint !== sub.endpoint,
        )
        if (daily.subscriptions.length >= 10)
          throw new Error(
            "Ten devices already registered. Remove an old subscription first.",
          )
        daily.subscriptions.push(sub)
      })
    } else if (body.action === "unsubscribe") {
      await dailyTransaction((daily) => {
        daily.subscriptions = daily.subscriptions.filter(
          (s) => s.endpoint !== body.endpoint,
        )
      })
    } else if (body.action === "test") {
      const sub = await dailyTransaction((daily) => {
        const sub = daily.subscriptions.find(
          (s) => s.endpoint === body.endpoint,
        )
        if (!sub) throw new Error("Subscribe this device first.")
        const previous = daily.deliveries["test"]
        if (previous && Date.now() - Date.parse(previous.at) < 30000)
          throw new Error("Wait 30 seconds between test notifications.")
        daily.deliveries["test"] = {
          state: "claimed",
          at: new Date().toISOString(),
        }
        return sub
      })
      try {
        await sendPush(sub, {
          title: "Aditya | My personal Tracker",
          body: "Your test notification. Tap to open Today.",
          tag: "test",
        })
        await dailyTransaction((daily) => {
          daily.deliveries.test = {
            state: "sent",
            at: new Date().toISOString(),
          }
        })
      } catch (error) {
        const code = (error as { statusCode?: number }).statusCode
        await dailyTransaction((daily) => {
          daily.deliveries.test = {
            state: "failed",
            at: new Date().toISOString(),
            detail: "Test not delivered; check configuration or reconnect.",
          }
        })
        if (code === 404 || code === 410)
          await dailyTransaction((daily) => {
            daily.subscriptions = daily.subscriptions.filter(
              (s) => s.endpoint !== sub.endpoint,
            )
          })
        throw new Error(
          code
            ? `Push service returned ${code}. Try reconnecting notifications.`
            : "Test could not be sent. Check server push configuration.",
        )
      }
    } else throw new Error("Unknown push action.")
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Push request failed.",
      },
      { status: 400 },
    )
  }
}
