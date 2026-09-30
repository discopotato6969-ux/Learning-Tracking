"use client"

import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import type { Lesson } from "@/data/courses"

interface LessonNavigationProps {
  lesson: Lesson
  previousLesson?: Lesson
  nextLesson?: Lesson
}

export default function LessonNavigation({ lesson, previousLesson, nextLesson }: LessonNavigationProps) {
  const router = useRouter()
  const [isComplete, setIsComplete] = useState(lesson.completed)
  const [isSaving, setIsSaving] = useState(false)

  async function toggleCompletion() {
    const completed = !isComplete
    setIsComplete(completed)
    setIsSaving(true)

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, completed }),
      })

      if (!response.ok) {
        setIsComplete(!completed)
      } else router.refresh()
    } catch {
      setIsComplete(!completed)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 border-y py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        {previousLesson ? <Link href={`/watch/${previousLesson.id}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden="true" />Previous lesson</Link> : <span />}
        {nextLesson && <Link href={`/watch/${nextLesson.id}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden">Next<ArrowRight className="size-4" aria-hidden="true" /></Link>}
      </div>
      <button type="button" onClick={toggleCompletion} disabled={isSaving} aria-pressed={isComplete} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"><Check className="size-4" aria-hidden="true" />{isSaving ? "Saving..." : isComplete ? "Completed" : "Mark as complete"}</button>
      {nextLesson ? <Link href={`/watch/${nextLesson.id}`} className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex">Next lesson<ArrowRight className="size-4" aria-hidden="true" /></Link> : <span />}
    </div>
  )
}
