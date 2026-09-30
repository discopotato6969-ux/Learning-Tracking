import { authorize } from "@/lib/session"
import { dailyTransaction, dailyView, mutateDaily } from "@/lib/daily-store"
import { localDate } from "@/lib/daily-model"

export async function GET() {
  const denied = await authorize()
  if (denied) return denied
  try {
    return Response.json(await dailyTransaction(dailyView), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return Response.json(
      {
        error:
          "Your data could not be read safely. Please retry; if this persists, check the store and backup.",
      },
      { status: 503 },
    )
  }
}
export async function POST(request: Request) {
  const denied = await authorize(request)
  if (denied) return denied
  const text = await request.text()
  if (text.length > 16000)
    return Response.json({ error: "Request too large." }, { status: 413 })
  let body
  try {
    body = JSON.parse(text)
    if (!body || typeof body !== "object") throw Error()
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }
  try {
    return Response.json(
      await dailyTransaction((daily, today) => {
        mutateDaily(daily, today, body)
        return dailyView(daily, localDate(new Date(), daily.settings.timeZone))
      }),
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save." },
      { status: 400 },
    )
  }
}
