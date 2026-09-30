import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  addDays,
  changeOccurrence,
  claimReminder,
  consistency,
  localDate,
  localTime,
  materialize,
  newDailyStore,
  scheduled,
  summary,
  validateTask,
  type TaskSpec,
} from "../src/lib/daily-model"
import { updateStore, readStore } from "../src/lib/file-store"

const spec: TaskSpec = {
  title: "Practice",
  category: "Learning",
  url: "https://example.com",
  notes: "",
  minutes: 15,
  priority: "normal",
  startDate: "2026-03-01",
  endDate: "",
  recurrence: "daily",
  weekdays: [1, 3],
  paused: false,
  courseId: "",
}
function store() {
  const d = newDailyStore(new Date("2026-03-01T00:00:00Z"))
  d.tasks = [
    {
      ...spec,
      id: "t",
      createdDate: "2026-03-01",
      versions: [{ from: "2026-03-01", spec: { ...spec } }],
    },
  ]
  return d
}
test("all recurrence modes, pause and inclusive boundaries", () => {
  assert.equal(scheduled(spec, "2026-02-28"), false)
  assert.equal(
    scheduled({ ...spec, endDate: "2026-03-02" }, "2026-03-02"),
    true,
  )
  assert.equal(
    scheduled({ ...spec, endDate: "2026-03-02" }, "2026-03-03"),
    false,
  )
  assert.equal(scheduled({ ...spec, paused: true }, "2026-03-02"), false)
  assert.equal(
    scheduled({ ...spec, recurrence: "weekdays" }, "2026-03-02"),
    true,
  )
  assert.equal(
    scheduled({ ...spec, recurrence: "weekdays" }, "2026-03-03"),
    false,
  )
  assert.equal(scheduled({ ...spec, recurrence: "weekly" }, "2026-03-08"), true)
  assert.equal(
    scheduled({ ...spec, recurrence: "weekly" }, "2026-03-09"),
    false,
  )
  assert.equal(scheduled({ ...spec, recurrence: "once" }, "2026-03-01"), true)
  assert.equal(scheduled({ ...spec, recurrence: "once" }, "2026-03-02"), false)
})
test("time zones and DST do not shift calendar dates", () => {
  assert.equal(
    localDate(new Date("2026-09-29T18:29:59Z"), "Asia/Kolkata"),
    "2026-09-29",
  )
  assert.equal(
    localDate(new Date("2026-09-29T18:30:00Z"), "Asia/Kolkata"),
    "2026-09-30",
  )
  assert.equal(
    localDate(new Date("2026-03-08T04:59:59Z"), "America/New_York"),
    "2026-03-07",
  )
  assert.equal(
    localTime(new Date("2026-03-08T07:00:00Z"), "America/New_York"),
    "03:00",
  )
  assert.equal(addDays("2026-03-08", 1), "2026-03-09")
  assert.equal(addDays("2028-02-28", 1), "2028-02-29")
})
test("fresh daily occurrences, catch-up, duplicate retries and completion history", () => {
  const d = store()
  materialize(d, "2026-03-01")
  changeOccurrence(d.occurrences["t:2026-03-01"], "completed", new Date())
  changeOccurrence(d.occurrences["t:2026-03-01"], "completed", new Date())
  materialize(d, "2026-03-03")
  materialize(d, "2026-03-03")
  assert.equal(Object.keys(d.occurrences).length, 3)
  assert.equal(d.occurrences["t:2026-03-02"].status, "pending")
  assert.equal(d.occurrences["t:2026-03-01"].history.length, 1)
})
test("versioned schedules preserve historical denominators", () => {
  const d = store()
  materialize(d, "2026-03-02")
  d.tasks[0].versions.push({
    from: "2026-03-03",
    spec: { ...spec, paused: true },
  })
  materialize(d, "2026-03-05")
  assert.equal(Object.keys(d.occurrences).length, 2)
  assert.equal(summary(Object.values(d.occurrences)).total, 2)
})
test("reschedule preserves identity, history and future routine", () => {
  const d = store()
  materialize(d, "2026-03-01")
  const row = d.occurrences["t:2026-03-01"]
  changeOccurrence(row, "reschedule", new Date(), "2026-03-03")
  changeOccurrence(row, "reschedule", new Date(), "2026-03-03")
  materialize(d, "2026-03-03")
  assert.equal(row.history.length, 1)
  assert.equal(
    Object.values(d.occurrences).filter((r) => r.date === "2026-03-01").length,
    0,
  )
  assert.equal(
    Object.values(d.occurrences).filter((r) => r.date === "2026-03-03").length,
    2,
  )
})
test("skips stay in denominator; off-days do not break weekly consistency", () => {
  const d = store()
  d.tasks[0].versions[0].spec.recurrence = "weekly"
  materialize(d, "2026-03-09")
  Object.values(d.occurrences).forEach((r) =>
    changeOccurrence(r, "completed", new Date()),
  )
  assert.equal(consistency(Object.values(d.occurrences), "2026-03-10"), 2)
  changeOccurrence(d.occurrences["t:2026-03-08"], "skipped", new Date())
  assert.deepEqual(summary(Object.values(d.occurrences)), {
    total: 2,
    completed: 1,
    skipped: 1,
    pending: 0,
    rate: 50,
  })
  assert.equal(consistency(Object.values(d.occurrences), "2026-03-10"), 0)
  assert.equal(summary([]).rate, null)
})
test("reminder retry, time-zone change and DST repeated hour cannot duplicate", () => {
  const d = store()
  d.settings = {
    timeZone: "America/New_York",
    remindersEnabled: true,
    reminderTime: "01:30",
  }
  const first = new Date("2026-11-01T05:30:00Z"),
    second = new Date("2026-11-01T06:30:00Z")
  assert.ok(claimReminder(d, "device", first))
  assert.equal(claimReminder(d, "device", second), null)
  d.settings.timeZone = "Europe/London"
  assert.equal(claimReminder(d, "device", second), null)
  assert.ok(claimReminder(d, "other-device", second))
  d.settings.remindersEnabled = false
  assert.equal(claimReminder(d, "new-device", second), null)
})
test("spring-forward skipped reminder time sends on first later check", () => {
  const d = store()
  d.settings = {
    timeZone: "America/New_York",
    remindersEnabled: true,
    reminderTime: "02:30",
  }
  assert.equal(
    claimReminder(d, "device", new Date("2026-03-08T06:59:00Z")),
    null,
  )
  assert.ok(claimReminder(d, "device", new Date("2026-03-08T07:00:00Z")))
})

test("time-zone travel cannot duplicate an already-recorded date", () => {
  const d = store()
  materialize(d, "2026-03-03")
  d.settings.timeZone = "America/Los_Angeles"
  materialize(d, "2026-03-02")
  materialize(d, "2026-03-03")
  assert.equal(Object.keys(d.occurrences).length, 3)
  assert.equal(d.occurrences["t:2026-03-01"].timeZone, "Asia/Kolkata")
})

test("two obligations on one date do not hide an unfinished past task", () => {
  const d = store()
  materialize(d, "2026-03-02")
  const first = d.occurrences["t:2026-03-01"]
  changeOccurrence(first, "reschedule", new Date(), "2026-03-02")
  changeOccurrence(first, "completed", new Date())
  assert.equal(consistency(Object.values(d.occurrences), "2026-03-03"), 0)
})

test("parallel scheduler claims reserve only one send per device and date", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "day-tracker-test-"))
  const file = path.join(dir, "store.json")
  try {
    await updateStore((s) => {
      s.daily = store()
      s.daily.settings.remindersEnabled = true
    }, file)
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        updateStore(
          (s) =>
            claimReminder(s.daily!, "device", new Date("2026-03-01T04:00:00Z")),
          file,
        ),
      ),
    )
    assert.equal(results.filter(Boolean).length, 1)
  } finally {
    assert.ok(
      path
        .resolve(dir)
        .startsWith(path.join(path.resolve(tmpdir()), "day-tracker-test-")),
    )
    await rm(dir, { recursive: true, force: true })
  }
})
test("invalid dates, unsafe URLs and empty weekday selections rejected", () => {
  for (const change of [
    { url: "javascript:alert(1)" },
    { url: "//evil.com" },
    { startDate: "2026-02-30" },
    { recurrence: "weekdays", weekdays: [] },
    { minutes: NaN },
  ])
    assert.throws(() => validateTask({ ...spec, ...change }))
  assert.equal(
    validateTask({ ...spec, url: "/watch/lesson" }).url,
    "/watch/lesson",
  )
})
test("atomic store preserves legacy keys and serializes concurrent writes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "day-tracker-test-"))
  const file = path.join(dir, "store.json")
  try {
    await writeFile(
      file,
      JSON.stringify({
        lessons: { old: { completed: true } },
        savedLinks: ["private-link"],
      }),
    )
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        updateStore((s) => {
          s.lessons[`new-${i}`] = {
            completed: false,
            positionSeconds: i,
            updatedAt: "test",
          }
        }, file),
      ),
    )
    const s = await readStore(file)
    assert.equal(Object.keys(s.lessons).length, 13)
    assert.deepEqual(s.savedLinks, ["private-link"])
    await writeFile(file, "broken json")
    await assert.rejects(updateStore(() => undefined, file))
    assert.equal(await readFile(file, "utf8"), "broken json")
  } finally {
    assert.ok(
      path
        .resolve(dir)
        .startsWith(path.join(path.resolve(tmpdir()), "day-tracker-test-")),
    )
    await rm(dir, { recursive: true, force: true })
  }
})
