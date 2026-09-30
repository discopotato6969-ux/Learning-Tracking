"use client"
import { useState, type FormEvent } from "react"
import { Check } from "lucide-react"
import { categories, type Task, type TaskSpec } from "@/lib/daily-model"
import {
  Label,
  field,
  button,
  primary,
  days,
  type Save,
  type Catalog,
} from "./daily-ui"
export default function TaskEditor({
  initial,
  catalog,
  busy,
  save,
  close,
}: {
  initial: TaskSpec | Task
  catalog: Catalog
  busy: boolean
  save: Save
  close: () => void
}) {
  const [task, setTask] = useState<TaskSpec>(initial)
  const set = <K extends keyof TaskSpec>(key: K, value: TaskSpec[K]) =>
    setTask((t) => ({ ...t, [key]: value }))
  const course = catalog.find((c) => c.id === task.courseId)
  return (
    <section
      className="rounded-2xl border border-emerald-800/20 bg-white p-5 shadow-sm sm:p-7"
      aria-label="Task editor"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {"id" in initial ? "Edit routine" : "Make a little plan"}
        </h2>
        <button type="button" className={button} onClick={close}>
          Cancel
        </button>
      </div>
      <form
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          if (
            await save({
              action: "task",
              id: "id" in initial ? initial.id : undefined,
              task,
            })
          )
            close()
        }}
        className="grid gap-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Label name="Title">
            <input
              autoFocus
              required
              maxLength={120}
              className={field}
              value={task.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Check my work inbox"
            />
          </Label>
        </div>
        <Label name="Category">
          <select
            className={field}
            value={task.category}
            onChange={(e) =>
              set("category", e.target.value as TaskSpec["category"])
            }
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Label>
        <Label name="Estimated minutes">
          <input
            required
            type="number"
            min={1}
            max={1440}
            className={field}
            value={task.minutes}
            onChange={(e) => set("minutes", Number(e.target.value))}
          />
        </Label>
        <Label name="Repeat">
          <select
            className={field}
            value={task.recurrence}
            onChange={(e) =>
              set("recurrence", e.target.value as TaskSpec["recurrence"])
            }
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Selected weekdays</option>
            <option value="weekly">Weekly on start-date weekday</option>
            <option value="once">One-off</option>
          </select>
        </Label>
        <Label name="Priority">
          <select
            className={field}
            value={task.priority}
            onChange={(e) =>
              set("priority", e.target.value as TaskSpec["priority"])
            }
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </Label>
        {task.recurrence === "weekdays" && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">
              Days of the week
            </legend>
            <div className="flex flex-wrap gap-2">
              {days.map((day, i) => (
                <label key={day} className={`${button} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={task.weekdays.includes(i)}
                    onChange={(e) =>
                      set(
                        "weekdays",
                        e.target.checked
                          ? [...task.weekdays, i].sort()
                          : task.weekdays.filter((d) => d !== i),
                      )
                    }
                    className="accent-emerald-800"
                  />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Label
          name={task.recurrence === "once" ? "Scheduled date" : "Start date"}
        >
          <input
            type="date"
            required
            className={field}
            value={task.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Label>
        <Label name="End date (optional)">
          <input
            type="date"
            min={task.startDate}
            className={field}
            value={task.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </Label>
        <Label name="Active course (optional)">
          <select
            className={field}
            value={task.courseId}
            onChange={(e) => set("courseId", e.target.value)}
          >
            <option value="">No course attached</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Label>
        {course ? (
          <Label name="Use a lesson link">
            <select
              className={field}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) set("url", `/watch/${e.target.value}`)
              }}
            >
              <option value="">Choose a lesson (optional)</option>
              {course.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </Label>
        ) : (
          <p className="self-center text-xs leading-5 text-zinc-500">
            Activate a saved course in Study to attach it. External Udemy,
            Coursera, and inbox links can go below.
          </p>
        )}
        <div className="sm:col-span-2">
          <Label name="Open link (optional)">
            <input
              maxLength={2048}
              className={field}
              value={task.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://… or /watch/lesson-id"
            />
          </Label>
        </div>
        <div className="sm:col-span-2">
          <Label name="Notes / short description">
            <textarea
              rows={2}
              maxLength={2000}
              className={field}
              value={task.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-emerald-800"
            checked={task.paused}
            onChange={(e) => set("paused", e.target.checked)}
          />
          Pause this routine
        </label>
        <button disabled={busy} className={primary}>
          <Check size={16} />
          {busy ? "Saving…" : "Save task"}
        </button>
      </form>
    </section>
  )
}
