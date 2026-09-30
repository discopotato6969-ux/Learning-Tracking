import { mkdir, open, readFile, rename, unlink } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { DailyStore } from "./daily-model"

export interface LessonProgress {
  completed: boolean
  positionSeconds: number
  playlistIndex?: number
  updatedAt: string
}
export interface HubStore {
  lessons: Record<string, LessonProgress>
  daily?: DailyStore
  [key: string]: unknown
}
export const dataFile =
  process.env.LEARNING_HUB_DATA_FILE ||
  path.join(process.cwd(), ".data", "learning-hub.json")

export async function readStore(file = dataFile): Promise<HubStore> {
  try {
    const store = JSON.parse(await readFile(file, "utf8"))
    if (
      !store ||
      typeof store !== "object" ||
      !store.lessons ||
      typeof store.lessons !== "object" ||
      Array.isArray(store.lessons)
    )
      throw new Error(
        "Invalid learning store; restore a backup before writing.",
      )
    if (store.daily && store.daily.version !== 1)
      throw new Error("Unsupported daily store version.")
    return store
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { lessons: {} }
    throw error
  }
}

// Cross-process exclusive lock plus atomic replacement. No automatic stale-lock stealing:
// an operator must inspect/remove a crash leftover instead of risking concurrent writers.
export async function updateStore<T>(
  update: (store: HubStore) => T | Promise<T>,
  file = dataFile,
): Promise<T> {
  await mkdir(path.dirname(file), { recursive: true })
  let lock
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      lock = await open(`${file}.lock`, "wx", 0o600)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  if (!lock)
    throw new Error(
      "Store is busy. Retry shortly; inspect the lock file if this persists.",
    )
  const temp = `${file}.${randomUUID()}.tmp`
  try {
    const store = await readStore(file)
    const result = await update(store)
    const handle = await open(temp, "wx", 0o600)
    try {
      await handle.writeFile(`${JSON.stringify(store, null, 2)}\n`)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temp, file)
    return result
  } finally {
    await unlink(temp).catch(() => undefined)
    await lock.close()
    await unlink(`${file}.lock`)
  }
}
