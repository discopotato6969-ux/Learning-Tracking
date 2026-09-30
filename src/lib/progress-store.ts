import "server-only"

import { connection } from "next/server"
import { readStore, updateStore, type LessonProgress } from "./file-store"
import { requireSession } from "./session"

import type { Course } from "@/data/courses"

export interface ProgressStore {
  lessons: Record<string, LessonProgress>
}

export async function readProgressStore(): Promise<ProgressStore> {
  // Progress changes on disk between requests and must never be baked into prerendered pages.
  await connection()
  await requireSession()
  return { lessons: (await readStore()).lessons }
}

export async function saveLessonProgress(
  lessonId: string,
  progress: Partial<Pick<LessonProgress, "completed" | "positionSeconds" | "playlistIndex">>,
) {
  await requireSession()
  return updateStore(store => {
    store.lessons[lessonId] = {
    ...(store.lessons[lessonId] ?? { completed: false, positionSeconds: 0 }),
    ...progress,
    updatedAt: new Date().toISOString(),
  }
  return store.lessons[lessonId]
  })
}

export function applyProgress(course: Course, store: ProgressStore): Course {
  const sections = course.sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({
      ...lesson,
      completed: store.lessons[lesson.id]?.completed ?? lesson.completed,
    })),
  }))
  const lessons = sections.flatMap((section) => section.lessons)
  const completedLessons = lessons.filter((lesson) => lesson.completed).length

  return {
    ...course,
    sections,
    completedLessons,
    progress: lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100),
  }
}
