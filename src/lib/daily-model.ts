// Pure calendar/domain logic: no browser, Next.js, storage or AI dependency.
export const categories = [
  "Work",
  "Learning",
  "Inspiration",
  "Personal",
] as const
export type Category = (typeof categories)[number]
export type Recurrence = "daily" | "weekdays" | "weekly" | "once"
export interface TaskSpec {
  title: string
  category: Category
  url: string
  notes: string
  minutes: number
  priority: "low" | "normal" | "high"
  startDate: string
  endDate: string
  recurrence: Recurrence
  weekdays: number[]
  paused: boolean
  courseId: string
}
export interface Task extends TaskSpec {
  id: string
  createdDate: string
  versions: Array<{ from: string; spec: TaskSpec }>
}
export interface Occurrence {
  id: string
  taskId: string
  scheduledDate: string
  date: string
  timeZone: string
  task: TaskSpec
  status: "pending" | "completed" | "skipped"
  history: Array<{ at: string; action: string; from?: string; to?: string }>
}
export interface CoursePlan {
  status: "later" | "active" | "finished"
  resumeUrl: string
  note: string
  updatedAt: string
}
export interface Subscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
  createdAt: string
  owner: "owner"
}
export interface Delivery {
  state: "claimed" | "sent" | "failed"
  at: string
  detail?: string
}
export interface DailyStore {
  version: 1
  settings: {
    timeZone: string
    reminderTime: string
    remindersEnabled: boolean
  }
  tasks: Task[]
  occurrences: Record<string, Occurrence>
  through: string
  coursePlans: Record<string, CoursePlan>
  subscriptions: Subscription[]
  deliveries: Record<string, Delivery>
  schedulerLastSeen?: string
}
export function localDate(now: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const get = (type: string) => p.find((x) => x.type === type)!.value
  return `${get("year")}-${get("month")}-${get("day")}`
}
export function localTime(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now)
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function scheduled(spec: TaskSpec, date: string) {
  if (
    spec.paused ||
    date < spec.startDate ||
    (spec.endDate && date > spec.endDate)
  )
    return false
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return (
    spec.recurrence === "daily" ||
    (spec.recurrence === "once" && date === spec.startDate) ||
    (spec.recurrence === "weekdays" && spec.weekdays.includes(weekday)) ||
    (spec.recurrence === "weekly" &&
      weekday === new Date(`${spec.startDate}T12:00:00Z`).getUTCDay())
  )
}
export function specOn(task: Task, date: string): TaskSpec | undefined {
  return task.versions.filter((v) => v.from <= date).at(-1)?.spec
}
export function materialize(store: DailyStore, today: string) {
  // Calendar arithmetic is UTC date-only; local midnight is never advanced by 24h.
  // Existing keys survive retries and time-zone changes, preserving recorded history.
  let from = store.through ? addDays(store.through, 1) : today
  if (from > today) from = today
  for (let date = from; date <= today; date = addDays(date, 1)) {
    for (const task of store.tasks) {
      const spec = specOn(task, date)
      if (!spec || date < task.createdDate || !scheduled(spec, date)) continue
      const id = `${task.id}:${date}`
      const url =
        spec.url ||
        (spec.courseId
          ? store.coursePlans[spec.courseId]?.resumeUrl ||
            `/courses/${spec.courseId}`
          : "")
      store.occurrences[id] ??= {
        id,
        taskId: task.id,
        scheduledDate: date,
        date,
        timeZone: store.settings.timeZone,
        task: { ...spec, url },
        status: "pending",
        history: [],
      }
    }
  }
  if (today > store.through) store.through = today
}
export function summary(rows: Occurrence[]) {
  const completed = rows.filter((r) => r.status === "completed").length
  const skipped = rows.filter((r) => r.status === "skipped").length
  return {
    total: rows.length,
    completed,
    skipped,
    pending: rows.length - completed - skipped,
    rate: rows.length ? Math.round((completed / rows.length) * 100) : null,
  }
}
export function consistency(rows: Occurrence[], today: string) {
  // Today's unfinished occurrence is still in progress. Off-days never break a run.
  const eligible = rows
    .filter((r) => r.date < today || r.status !== "pending")
    .sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const date of [...new Set(eligible.map((r) => r.date))]) {
    const group = eligible.filter((r) => r.date === date)
    if (group.some((r) => r.status !== "completed")) break
    streak += group.length
  }
  return streak
}
export function changeOccurrence(
  row: Occurrence,
  action: string,
  now: Date,
  to?: string,
) {
  if (action === "reschedule") {
    if (!to || !validDate(to)) throw new Error("Choose a valid new date.")
    if (row.status !== "pending")
      throw new Error("Undo completion or skip before rescheduling.")
    if (row.date === to) return
    row.history.push({ at: now.toISOString(), action, from: row.date, to })
    row.date = to
  } else {
    if (!["pending", "completed", "skipped"].includes(action))
      throw new Error("Invalid occurrence action.")
    if (row.status === action) return
    row.status = action as Occurrence["status"]
    row.history.push({ at: now.toISOString(), action })
  }
}
export function claimReminder(
  store: DailyStore,
  endpointId: string,
  now: Date,
) {
  const date = localDate(now, store.settings.timeZone)
  // Date only, not time-zone name: travelling or changing reminder time cannot resend that date.
  const key = `${date}:${endpointId}`
  if (
    !store.settings.remindersEnabled ||
    localTime(now, store.settings.timeZone) < store.settings.reminderTime ||
    store.deliveries[key]
  )
    return null
  store.deliveries[key] = { state: "claimed", at: now.toISOString() }
  return key
}
export function safeUrl(value: string) {
  if (!value) return true
  if (/^\/(?![\/\\])/.test(value) && !value.includes("\\")) return true
  try {
    const u = new URL(value)
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    )
  } catch {
    return false
  }
}
export function validateTask(value: unknown): TaskSpec {
  if (!value || typeof value !== "object") throw new Error("Invalid task.")
  const x = value as TaskSpec
  for (const key of [
    "title",
    "category",
    "url",
    "notes",
    "priority",
    "startDate",
    "endDate",
    "recurrence",
    "courseId",
  ] as const) {
    if (typeof x[key] !== "string") throw new Error(`Invalid ${key}.`)
  }
  if (
    !x.title.trim() ||
    x.title.length > 120 ||
    x.notes.length > 2000 ||
    x.url.length > 2048 ||
    !safeUrl(x.url)
  )
    throw new Error(
      "Use a title (up to 120 characters) and a valid http(s) or local link.",
    )
  if (
    !categories.includes(x.category) ||
    !["daily", "weekdays", "weekly", "once"].includes(x.recurrence) ||
    !["low", "normal", "high"].includes(x.priority)
  )
    throw new Error("Invalid category, recurrence or priority.")
  if (
    !validDate(x.startDate) ||
    (x.endDate && (!validDate(x.endDate) || x.endDate < x.startDate))
  )
    throw new Error("Check the start and end dates.")
  if (
    !Array.isArray(x.weekdays) ||
    x.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    (x.recurrence === "weekdays" && !x.weekdays.length)
  )
    throw new Error("Select at least one weekday.")
  if (
    !Number.isInteger(x.minutes) ||
    x.minutes < 1 ||
    x.minutes > 1440 ||
    typeof x.paused !== "boolean"
  )
    throw new Error("Estimated minutes must be between 1 and 1440.")
  return {
    title: x.title.trim(),
    category: x.category,
    url: x.url.trim(),
    notes: x.notes.trim(),
    minutes: x.minutes,
    priority: x.priority,
    startDate: x.startDate,
    endDate: x.endDate,
    recurrence: x.recurrence,
    weekdays: [...new Set(x.weekdays)],
    paused: x.paused,
    courseId: x.courseId,
  }
}
export function newDailyStore(now = new Date()): DailyStore {
  const today = localDate(now, "Asia/Kolkata")
  const examples: Array<Partial<TaskSpec> & { title: string }> = [
    { title: "Personal inbox", category: "Work" },
    { title: "Work inbox", category: "Work" },
    { title: "Other inbox", category: "Work" },
    {
      title: "Five minutes of inspiration",
      category: "Inspiration",
      url: "https://www.awwwards.com/",
    },
    { title: "Practise Italian", category: "Learning", minutes: 15 },
    { title: "Practise piano", minutes: 15 },
  ]
  return {
    version: 1,
    settings: {
      timeZone: "Asia/Kolkata",
      reminderTime: "08:00",
      remindersEnabled: false,
    },
    tasks: examples.map((example, i) => {
      const spec: TaskSpec = {
        category: "Personal",
        url: "",
        notes: "Editable example — add your link and unpause when ready.",
        minutes: 5,
        priority: "normal",
        startDate: today,
        endDate: "",
        recurrence: "daily",
        weekdays: [],
        paused: true,
        courseId: "",
        ...example,
      }
      return {
        ...spec,
        id: `example-${i}`,
        createdDate: today,
        versions: [{ from: today, spec }],
      }
    }),
    occurrences: {},
    through: addDays(today, -1),
    coursePlans: {},
    subscriptions: [],
    deliveries: {},
  }
}
