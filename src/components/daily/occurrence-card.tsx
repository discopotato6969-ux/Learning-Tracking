"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"
import { addDays, type Occurrence } from "@/lib/daily-model"
import { Label, field, button, primary, type Save } from "./daily-ui"
export default function OccurrenceCard({
  row,
  today,
  busy,
  save,
}: {
  row: Occurrence
  today: string
  busy: boolean
  save: Save
}) {
  const [moving, setMoving] = useState(false)
  const [target, setTarget] = useState(addDays(today, 1))
  const url =
    row.task.url || (row.task.courseId ? `/courses/${row.task.courseId}` : "")
  return (
    <article
      className={`rounded-2xl border bg-white p-4 sm:p-5 ${row.status === "completed" ? "border-emerald-200 bg-emerald-50/30!" : "border-zinc-200/80"}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            aria-label={`Complete ${row.task.title}`}
            checked={row.status === "completed"}
            disabled={busy}
            onChange={() =>
              save({
                action: "occurrence",
                id: row.id,
                status: row.status === "completed" ? "pending" : "completed",
              })
            }
            className="size-6 accent-emerald-800"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`pt-1 font-medium ${row.status === "completed" ? "text-zinc-500 line-through" : ""}`}
            >
              {row.task.title}
            </h3>
            {row.task.priority === "high" && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                Priority
              </span>
            )}
          </div>
          {row.task.notes && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-500">
              {row.task.notes}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {row.task.minutes} min
            </span>
            <span>
              {row.task.courseId ? "Course study" : row.task.category}
            </span>
            <span
              className={row.status === "completed" ? "text-emerald-800" : ""}
            >
              {row.status === "pending"
                ? "Scheduled"
                : row.status === "skipped"
                  ? "Intentionally skipped"
                  : "Completed"}
            </span>
            {row.scheduledDate !== row.date && (
              <span>Moved from {row.scheduledDate}</span>
            )}
          </div>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button} shrink-0 px-3!`}
            aria-label={`Open ${row.task.title}`}
          >
            Open
            <ArrowUpRight size={15} />
          </a>
        )}
      </div>
      <div className="ml-14 mt-2 flex flex-wrap gap-1 sm:ml-15">
        {!url && (
          <Link
            className="py-2 text-xs text-emerald-800 underline"
            href="/tasks"
          >
            Add a link in Routines
          </Link>
        )}
        {row.status !== "completed" && (
          <button
            disabled={busy}
            className="min-h-11 px-3 text-xs text-zinc-500 underline-offset-4 hover:underline"
            onClick={() =>
              save({
                action: "occurrence",
                id: row.id,
                status: row.status === "skipped" ? "pending" : "skipped",
              })
            }
          >
            {row.status === "skipped" ? "Undo skip" : "Skip this occurrence"}
          </button>
        )}
        {row.status === "pending" && (
          <button
            className="min-h-11 px-3 text-xs text-zinc-500 hover:underline"
            disabled={busy}
            onClick={() => setMoving(!moving)}
          >
            Reschedule
          </button>
        )}
      </div>
      {moving && (
        <form
          className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-zinc-50 p-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (
              await save({
                action: "occurrence",
                id: row.id,
                status: "reschedule",
                to: target,
              })
            )
              setMoving(false)
          }}
        >
          <Label name="Move only this occurrence">
            <input
              className={field}
              required
              type="date"
              min={today}
              max={addDays(today, 366)}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Label>
          <button disabled={busy} className={primary}>
            Move task
          </button>
        </form>
      )}
      {row.history.length > 0 && (
        <details className="ml-14 mt-2 text-xs text-zinc-500">
          <summary className="cursor-pointer py-2">History</summary>
          <ul className="space-y-2">
            {row.history.map((h, i) => (
              <li key={i}>
                {h.at.slice(0, 16).replace("T", " ")} UTC · {h.action}
                {h.to ? `: ${h.from} → ${h.to}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}
