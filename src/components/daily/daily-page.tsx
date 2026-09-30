import { requireSession } from "@/lib/session"
import { dailyTransaction, dailyView } from "@/lib/daily-store"
import { courses } from "@/data/courses"
import DailyShell from "./daily-shell"
import DailyClient from "./daily-client"

export default async function DailyPage({
  view,
}: {
  view: "today" | "tasks" | "study" | "insights" | "settings"
}) {
  await requireSession()
  const initial = await dailyTransaction(dailyView)
  const catalog = courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    totalLessons: c.totalLessons,
    lessons: c.sections
      .flatMap((s) => s.lessons)
      .map((l) => ({ id: l.id, title: l.title })),
  }))
  return (
    <DailyShell current={`/${view}`}>
      <DailyClient initial={initial} catalog={catalog} view={view} />
    </DailyShell>
  )
}
