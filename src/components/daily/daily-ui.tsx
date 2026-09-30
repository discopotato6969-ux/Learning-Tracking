import type { ReactNode } from "react"
import type { TaskSpec } from "@/lib/daily-model"
export type Catalog = Array<{
  id: string
  title: string
  category: string
  totalLessons: number
  lessons: Array<{ id: string; title: string }>
}>
export type Save = (body: Record<string, unknown>) => Promise<boolean>
export const field =
  "min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
export const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
export const primary = `${button} border-emerald-900! bg-emerald-900! text-white hover:bg-emerald-800!`
export function Label({
  name,
  children,
}: {
  name: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{name}</span>
      {children}
    </label>
  )
}
export const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export function scheduleLabel(task: TaskSpec) {
  return task.recurrence === "once"
    ? `Once · ${task.startDate}`
    : task.recurrence === "weekdays"
      ? task.weekdays.map((d) => days[d]).join(", ")
      : task.recurrence === "weekly"
        ? `Weekly · ${days[new Date(`${task.startDate}T12:00:00Z`).getUTCDay()]}`
        : "Every day"
}
