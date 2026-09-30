import { ArrowRight, Play } from "lucide-react"
import Link from "next/link"

import type { Course } from "@/data/courses"

export default function ContinueWatching({ courses }: { courses: Course[] }) {
  const inProgress = courses.filter((course) => course.progress > 0 && course.progress < 100).slice(0, 3)

  return (
    <section id="continue-watching" aria-labelledby="continue-watching-heading">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="continue-watching-heading" className="text-lg font-semibold tracking-tight">Continue Watching</h2>
        <Link href="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View all</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {inProgress.map((course) => (
          <article key={course.id} className="overflow-hidden rounded-xl border bg-background">
            <div className="flex gap-4 p-4">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl font-semibold text-muted-foreground">{course.category.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted-foreground">{course.category}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{course.title}</h3>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{course.progress}% complete</span><span>{course.duration}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${course.progress}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.progress}><div className="h-full rounded-full bg-foreground" style={{ width: `${course.progress}%` }} /></div>
              </div>
            </div>
            <Link href={`/courses/${course.id}`} className="flex items-center justify-center gap-2 border-t px-4 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"><Play className="size-3.5 fill-current" aria-hidden="true" />Continue learning<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
          </article>
        ))}
      </div>
    </section>
  )
}
