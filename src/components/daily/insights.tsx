import Link from "next/link"
import { addDays, categories, summary, consistency } from "@/lib/daily-model"
import type { DailyView } from "@/lib/daily-store"
import type { Catalog } from "./daily-ui"
export default function Insights({
  data,
  catalog,
}: {
  data: DailyView
  catalog: Catalog
}) {
  const rows = data.occurrences.filter((r) => r.date <= data.today)
  const windows = [
    { label: "Today", start: data.today },
    { label: "Last 7 days", start: addDays(data.today, -6) },
    { label: "Last 30 days", start: addDays(data.today, -29) },
  ]
  const recent = Array.from({ length: 14 }, (_, i) =>
    addDays(data.today, i - 13),
  )
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {windows.map((w) => {
          const s = summary(rows.filter((r) => r.date >= w.start))
          return (
            <div key={w.label} className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-zinc-500">{w.label}</p>
              <p className="mt-3 text-3xl font-semibold">
                {s.rate === null ? "—" : `${s.rate}%`}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {s.completed}/{s.total} completed · {s.skipped} skipped
              </p>
            </div>
          )
        })}
      </div>
      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="font-semibold">The last two weeks</h2>
        <div className="mt-6 flex h-36 items-end gap-1.5 sm:gap-3">
          {recent.map((date) => {
            const s = summary(rows.filter((r) => r.date === date))
            return (
              <div
                key={date}
                className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
              >
                <div
                  className="flex h-28 items-end rounded-md bg-zinc-50"
                  title={`${date}: ${s.completed}/${s.total} complete, ${s.skipped} skipped`}
                >
                  <div
                    className="w-full rounded-md bg-emerald-700"
                    style={{
                      height:
                        s.rate === null ? "0%" : `${Math.max(3, s.rate)}%`,
                      opacity: s.rate === 0 ? 0.25 : 1,
                    }}
                  />
                </div>
                <span className="mt-2 text-[10px] text-zinc-500">
                  {date.slice(-2)}
                </span>
              </div>
            )
          })}
        </div>
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-zinc-500">
            Daily numbers
          </summary>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2">Date</th>
                  <th>Complete</th>
                  <th>Scheduled</th>
                  <th>Skipped</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((date) => {
                  const s = summary(rows.filter((r) => r.date === date))
                  return (
                    <tr key={date} className="border-t">
                      <td className="py-2">{date}</td>
                      <td>{s.completed}</td>
                      <td>{s.total}</td>
                      <td>{s.skipped}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        {["weekly", "monthly"].map((period) => {
          const groups = Array.from(
            { length: period === "weekly" ? 6 : 6 },
            (_, i) => {
              if (period === "weekly") {
                const weekday = new Date(`${data.today}T12:00:00Z`).getUTCDay()
                const end = addDays(
                  data.today,
                  (-(weekday + 6) % 7) - i * 7 + 6,
                )
                return {
                  start: addDays(end, -6),
                  end,
                  label: `Week of ${addDays(end, -6)}`,
                }
              }
              const d = new Date(`${data.today.slice(0, 7)}-01T12:00:00Z`)
              d.setUTCMonth(d.getUTCMonth() - i)
              const start = d.toISOString().slice(0, 10)
              d.setUTCMonth(d.getUTCMonth() + 1)
              return {
                start,
                end: addDays(d.toISOString().slice(0, 10), -1),
                label: start.slice(0, 7),
              }
            },
          )
          return (
            <section key={period} className="rounded-2xl border bg-white p-5">
              <h2 className="mb-5 font-semibold">
                {period === "weekly" ? "Weekly" : "Monthly"} completion
              </h2>
              {groups.reverse().map((g) => {
                const s = summary(
                  rows.filter((r) => r.date >= g.start && r.date <= g.end),
                )
                return (
                  <div key={g.start} className="mb-4">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{g.label}</span>
                      <span>
                        {s.rate === null
                          ? "No tasks"
                          : `${s.rate}% · ${s.completed}/${s.total}`}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-emerald-700"
                        style={{ width: `${s.rate || 0}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-5 font-semibold">By category · last 30 days</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {categories.map((category) => {
            const s = summary(
              rows.filter(
                (r) =>
                  r.date >= addDays(data.today, -29) &&
                  r.task.category === category,
              ),
            )
            return (
              <div key={category}>
                <div className="flex justify-between text-sm">
                  <span>{category}</span>
                  <span className="text-zinc-500">
                    {s.completed}/{s.total} · {s.skipped} skipped
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${s.rate || 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">Consistency, on your schedule</h2>
        {data.tasks
          .filter((t) => t.recurrence !== "once")
          .map((t) => {
            const own = rows.filter((r) => r.taskId === t.id)
            const s = summary(own)
            return (
              <div
                key={t.id}
                className="flex flex-wrap justify-between gap-2 border-t py-4 text-sm"
              >
                <span>{t.title}</span>
                <span className="text-zinc-500">
                  {s.completed}/{s.total} completed ·{" "}
                  {consistency(own, data.today)} scheduled occurrences in a row
                </span>
              </div>
            )
          })}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">Active courses</h2>
        {catalog
          .filter((c) => data.coursePlans[c.id]?.status === "active")
          .map((c) => {
            const s = summary(rows.filter((r) => r.task.courseId === c.id))
            return (
              <div key={c.id} className="border-t py-4">
                <Link href="/study" className="font-medium text-emerald-800">
                  {c.title}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">
                  {s.completed}/{s.total} study tasks completed · last note{" "}
                  {data.coursePlans[c.id].updatedAt.slice(0, 10)}
                </p>
                <p className="mt-2 text-sm">{data.coursePlans[c.id].note}</p>
              </div>
            )
          })}
        <Link href="/study" className="text-sm text-emerald-800 underline">
          Manage study plan
        </Link>
      </section>
      <p className="text-xs leading-6 text-zinc-500">
        Rates = completed ÷ actually scheduled tasks, including intentional
        skips. Rescheduled tasks count on their destination date. Off-days have
        no denominator and do not break consistency. A skipped or unfinished
        past occurrence ends a run; today stays open until the day ends. History
        begins when you create a routine and is never backfilled before
        creation.
      </p>
    </div>
  )
}
