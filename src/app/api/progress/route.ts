import { NextResponse } from "next/server"

import { getLessonById } from "@/data/courses"
import { readProgressStore, saveLessonProgress } from "@/lib/progress-store"
import { authorize } from "@/lib/session"

export async function GET() {
  const denied = await authorize(); if (denied) return denied
  return NextResponse.json(await readProgressStore())
}

export async function POST(request: Request) {
  const denied = await authorize(request); if (denied) return denied
  const body = await request.json().catch(() => null)
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : ""
  const completed = typeof body?.completed === "boolean" ? body.completed : undefined
  const positionSeconds = typeof body?.positionSeconds === "number" && Number.isFinite(body.positionSeconds) ? body.positionSeconds : undefined
  const playlistIndex = typeof body?.playlistIndex === "number" && Number.isFinite(body.playlistIndex) ? body.playlistIndex : undefined

  if (!lessonId || (completed === undefined && positionSeconds === undefined && playlistIndex === undefined) || !getLessonById(lessonId)) {
    return NextResponse.json({ error: "Invalid lesson progress payload." }, { status: 400 })
  }

  const progress = await saveLessonProgress(lessonId, {
    ...(completed === undefined ? {} : { completed }),
    ...(positionSeconds === undefined ? {} : { positionSeconds: Math.max(0, Math.floor(positionSeconds)) }),
    ...(playlistIndex === undefined ? {} : { playlistIndex: Math.max(0, Math.floor(playlistIndex)) }),
  })

  return NextResponse.json(progress)
}
