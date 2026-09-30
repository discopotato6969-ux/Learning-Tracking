import { timingSafeEqual } from "node:crypto"
import { morningJob } from "@/lib/push"

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const received = Buffer.from(request.headers.get("authorization") || "")
  const expected = Buffer.from(`Bearer ${secret}`)
  if (
    !secret ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  try {
    return Response.json(await morningJob(), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(
      {
        error:
          "Morning job unavailable. Check push configuration and persistent storage.",
      },
      { status: 503 },
    )
  }
}
