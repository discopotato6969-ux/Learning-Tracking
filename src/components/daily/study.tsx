"use client"
import { ArrowUpRight, Plus } from "lucide-react"
import type { DailyView } from "@/lib/daily-store"
import {
  Label,
  field,
  button,
  primary,
  type Save,
  type Catalog,
} from "./daily-ui"
export default function Study({
  data,
  catalog,
  busy,
  save,
  addTask,
}: {
  data: DailyView
  catalog: Catalog
  busy: boolean
  save: Save
  addTask: (id: string) => void
}) {
  return (
    <div className="space-y-9">
      {(["active", "later", "finished"] as const).map((status) => (
        <section key={status}>
          <h2 className="mb-4 text-lg font-semibold">
            {status === "active"
              ? "Actively studying"
              : status === "later"
                ? "Saved for later"
                : "Finished"}{" "}
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {
                catalog.filter(
                  (c) => (data.coursePlans[c.id]?.status || "later") === status,
                ).length
              }
            </span>
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {catalog
              .filter(
                (c) => (data.coursePlans[c.id]?.status || "later") === status,
              )
              .map((course) => (
                <CoursePlanCard
                  key={course.id}
                  course={course}
                  plan={data.coursePlans[course.id]}
                  busy={busy}
                  save={save}
                  addTask={addTask}
                />
              ))}
          </div>
          {status === "active" &&
            !catalog.some(
              (c) => data.coursePlans[c.id]?.status === "active",
            ) && (
              <p className="rounded-xl border border-dashed p-5 text-sm text-zinc-500">
                Choose an active course below. Nothing is added to Today until
                you create a study routine.
              </p>
            )}
        </section>
      ))}
    </div>
  )
}
function CoursePlanCard({
  course,
  plan,
  busy,
  save,
  addTask,
}: {
  course: Catalog[number]
  plan?: DailyView["coursePlans"][string]
  busy: boolean
  save: Save
  addTask: (id: string) => void
}) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white p-5">
      <p className="text-xs text-emerald-800">
        {course.category} · {course.totalLessons} lessons
      </p>
      <h3 className="mt-2 text-lg font-semibold">{course.title}</h3>
      <form
        key={plan?.updatedAt || "new"}
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          await save({
            action: "course",
            id: course.id,
            status: f.get("status"),
            resumeUrl: f.get("resumeUrl"),
            note: f.get("note"),
          })
        }}
      >
        <Label name="Study status">
          <select
            name="status"
            defaultValue={plan?.status || "later"}
            className={field}
          >
            <option value="later">Saved for later</option>
            <option value="active">Actively studying</option>
            <option value="finished">Finished</option>
          </select>
        </Label>
        <Label name="Current lesson / resume link">
          <input
            name="resumeUrl"
            defaultValue={plan?.resumeUrl || ""}
            className={field}
            maxLength={2048}
            placeholder={`/courses/${course.id}`}
          />
        </Label>
        <Label name="Where I left off">
          <textarea
            name="note"
            defaultValue={plan?.note || ""}
            className={field}
            maxLength={2000}
            rows={2}
            placeholder="e.g. Lesson 3, practising functions"
          />
        </Label>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={primary}>
            Save progress note
          </button>
          <a
            href={plan?.resumeUrl || `/courses/${course.id}`}
            className={button}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open <ArrowUpRight size={14} />
          </a>
          {plan?.status === "active" && (
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => {
                addTask(course.id)
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            >
              Study routine <Plus size={14} />
            </button>
          )}
        </div>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        {plan
          ? `Last update: ${plan.updatedAt.slice(0, 10)}`
          : "No progress note yet"}
      </p>
    </article>
  )
}
