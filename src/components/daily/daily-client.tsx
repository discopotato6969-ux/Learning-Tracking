"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Plus, CalendarDays, Pause, Play, ArrowRight } from "lucide-react"
import {
  categories,
  summary,
  type Task,
  type TaskSpec,
} from "@/lib/daily-model"
import type { DailyView } from "@/lib/daily-store"
import {
  button,
  primary,
  scheduleLabel,
  type Catalog,
  type Save,
} from "./daily-ui"
import ReminderSettings from "./reminder-settings"
import TaskEditor from "./task-editor"
import OccurrenceCard from "./occurrence-card"
import Study from "./study"
import Insights from "./insights"
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`))
}
function blank(today: string): TaskSpec {
  return {
    title: "",
    category: "Personal",
    url: "",
    notes: "",
    minutes: 10,
    priority: "normal",
    startDate: today,
    endDate: "",
    recurrence: "daily",
    weekdays: [1, 2, 3, 4, 5],
    paused: false,
    courseId: "",
  }
}
export default function DailyClient({
  initial,
  catalog,
  view,
}: {
  initial: DailyView
  catalog: Catalog
  view: string
}) {
  const [data, setData] = useState(initial)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [date, setDate] = useState(initial.today)
  const [editor, setEditor] = useState<TaskSpec | Task | null>(null)
  const saving = useRef(false)
  const revision = useRef(0)
  const currentToday = useRef(initial.today)
  useEffect(() => {
    const refresh = () => {
      if (saving.current) return
      const requestRevision = revision.current
      setOffline(!navigator.onLine)
      if (navigator.onLine)
        fetch("/api/daily", { cache: "no-store" })
          .then((r) => {
            if (!r.ok) throw Error("Please reload and sign in again.")
            return r.json()
          })
          .then((next: DailyView) => {
            if (saving.current || requestRevision !== revision.current) return
            setData(next)
            const previousToday = currentToday.current
            currentToday.current = next.today
            setDate((previous) =>
              previous === previousToday ? next.today : previous,
            )
          })
          .catch(() =>
            setError(
              "Could not refresh. Check your connection or sign in again.",
            ),
          )
    }
    const wentOffline = () => setOffline(true)
    window.addEventListener("online", refresh)
    window.addEventListener("offline", wentOffline)
    window.addEventListener("focus", refresh)
    refresh()
    const timer = window.setInterval(refresh, 60000) // Refresh the visible date, never schedule notifications.
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("online", refresh)
      window.removeEventListener("offline", wentOffline)
      window.removeEventListener("focus", refresh)
    }
  }, [initial.today])
  const save: Save = async (body) => {
    if (saving.current || offline) return false
    saving.current = true
    revision.current++
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not save.")
      setData(result)
      const previousToday = currentToday.current
      currentToday.current = result.today
      setDate((previous) =>
        previous === previousToday ? result.today : previous,
      )
      setMessage("Saved.")
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save. Try again.")
      return false
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  const rows = data.occurrences.filter((r) => r.date === date)
  const stats = summary(rows)
  const locked = busy || offline
  const titles: Record<string, [string, string]> = {
    today: [
      "A little progress, every day.",
      "Make room for what matters. One task at a time.",
    ],
    tasks: [
      "Your routines",
      "A small, intentional plan. Adjust it as life changes.",
    ],
    study: [
      "Keep your place",
      "Choose what you’re learning now. The rest can wait.",
    ],
    insights: [
      "Find your rhythm",
      "A clear view of what you planned and what you did.",
    ],
    settings: [
      "Make it yours",
      "Your time zone, morning reminder, and Home Screen setup.",
    ],
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            {view === "today" ? dateLabel(data.today) : "Aditya | My personal Tracker"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {titles[view][0]}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
            {titles[view][1]}
          </p>
        </div>
        {["today", "tasks"].includes(view) && (
          <button
            className={primary}
            disabled={locked}
            onClick={() =>
              setEditor({
                ...blank(data.today),
                recurrence: view === "today" ? "once" : "daily",
              })
            }
          >
            <Plus size={17} />
            {view === "today" ? "Add for today" : "New routine"}
          </button>
        )}
      </div>
      {offline && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          You’re offline. This is the last loaded view. Reconnect to save
          changes; nothing is queued or marked complete automatically.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"
        >
          {error}{" "}
          <a href="/today" className="underline">
            Reload
          </a>
        </div>
      )}
      <p role="status" className="sr-only">
        {message}
        {busy ? "Saving…" : ""}
      </p>
      {editor && (
        <TaskEditor
          key={"id" in editor ? editor.id : `new-${editor.recurrence}`}
          initial={editor}
          catalog={catalog.filter(
            (c) =>
              data.coursePlans[c.id]?.status === "active" ||
              c.id === editor.courseId,
          )}
          busy={locked}
          close={() => setEditor(null)}
          save={save}
        />
      )}
      {view === "today" && (
        <>
          <section
            className="grid gap-5 rounded-2xl bg-emerald-950 p-6 text-white sm:grid-cols-[1fr_auto] sm:p-8"
            aria-label="Daily progress"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-emerald-200/70">
                Your checklist
              </p>
              <div className="mt-3 text-3xl font-semibold">
                {stats.completed}{" "}
                <span className="text-lg font-normal text-emerald-100/70">
                  of {stats.total} completed
                </span>
              </div>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-label="Daily completion"
                aria-valuenow={stats.rate ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all"
                  style={{ width: `${stats.rate ?? 0}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-emerald-100/70">
                {stats.pending} scheduled · {stats.skipped} intentionally
                skipped ·{" "}
                {rows
                  .filter((r) => r.status === "pending")
                  .reduce((n, r) => n + r.task.minutes, 0)}{" "}
                min planned
              </p>
            </div>
            <div className="self-center">
              <label className="block text-xs text-emerald-100/70">
                View a date
                <input
                  aria-label="Checklist date"
                  className="mt-2 block min-h-11 rounded-lg bg-white/10 px-3 text-base text-white scheme-dark"
                  type="date"
                  max={data.today}
                  value={date}
                  onChange={(e) => setDate(e.target.value || data.today)}
                />
              </label>
              <p className="mt-2 text-xs text-emerald-100/60">
                {data.settings.timeZone}
              </p>
            </div>
          </section>
          {rows.length === 0 && (
            <Empty
              title="A little breathing room"
              text="Nothing scheduled for this date. Add a task for today or unpause an example in Routines."
            />
          )}
          {categories.map((category) => {
            const group = rows.filter((r) => r.task.category === category)
            if (!group.length) return null
            return (
              <section key={category}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-semibold">{category}</h2>
                  <span className="rounded-full bg-zinc-200/60 px-2.5 py-0.5 text-xs text-zinc-500">
                    {group.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {[...group]
                    .sort(
                      (a, b) =>
                        Number(a.status !== "pending") -
                          Number(b.status !== "pending") ||
                        Number(b.task.priority === "high") -
                          Number(a.task.priority === "high"),
                    )
                    .map((row) => (
                      <OccurrenceCard
                        key={row.id}
                        row={row}
                        today={data.today}
                        busy={locked}
                        save={save}
                      />
                    ))}
                </div>
              </section>
            )
          })}
          {data.occurrences.some(
            (r) => r.scheduledDate === date && r.date !== date,
          ) && (
            <section className="rounded-xl border border-dashed p-5">
              <h2 className="text-sm font-semibold">
                Rescheduled from this date
              </h2>
              {data.occurrences
                .filter((r) => r.scheduledDate === date && r.date !== date)
                .map((r) => (
                  <p key={r.id} className="mt-2 text-sm text-zinc-500">
                    {r.task.title} <ArrowRight className="inline" size={13} />{" "}
                    {r.date}
                  </p>
                ))}
            </section>
          )}
          <p className="text-xs leading-5 text-zinc-500">
            Opening a link never completes a task. Skipped tasks remain in the
            completion total. Rescheduled tasks count on their new date.
          </p>
        </>
      )}
      {view === "tasks" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-4 text-sm leading-6 text-zinc-600">
            Examples start paused. Add friendly inbox labels and links only — no
            email passwords. Changes affect today’s untouched tasks and future
            schedules; completed, skipped, and moved occurrences keep their
            history.
          </div>
          {data.tasks.map((task) => (
            <article
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5"
            >
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">
                  {task.category} · {scheduleLabel(task)} · {task.minutes} min
                </p>
                <h2 className="mt-1 font-semibold">{task.title}</h2>
                <p className="mt-2 text-xs text-zinc-500">
                  {task.paused ? "Paused" : "Scheduled"}
                  {task.endDate ? ` · Ends ${task.endDate}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={button}
                  disabled={locked}
                  onClick={() => setEditor(task)}
                >
                  Edit
                </button>
                <button
                  className={button}
                  disabled={locked}
                  aria-label={`${task.paused ? "Resume" : "Pause"} ${task.title}`}
                  onClick={() =>
                    save({
                      action: "task",
                      id: task.id,
                      task: { ...task, paused: !task.paused },
                    })
                  }
                >
                  {task.paused ? <Play size={15} /> : <Pause size={15} />}
                  {task.paused ? "Resume" : "Pause"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {view === "study" && (
        <Study
          data={data}
          catalog={catalog}
          busy={locked}
          save={save}
          addTask={(id) =>
            setEditor({
              ...blank(data.today),
              title: `Study ${catalog.find((c) => c.id === id)?.title}`,
              category: "Learning",
              courseId: id,
              minutes: 25,
            })
          }
        />
      )}
      {view === "insights" && <Insights data={data} catalog={catalog} />}
      {view === "settings" && (
        <ReminderSettings data={data} busy={locked} save={save} />
      )}
    </div>
  )
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-9 text-center">
      <CalendarDays className="mx-auto text-emerald-700" size={25} />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {text}
      </p>
      <Link
        className="mt-4 inline-block text-sm font-medium text-emerald-800 underline underline-offset-4"
        href="/tasks"
      >
        Manage routines
      </Link>
    </div>
  )
}
