"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { DailyView } from "@/lib/daily-store"
import { button, field, Label, primary, type Save } from "./daily-ui"

export default function ReminderSettings({
  data,
  busy,
  save,
}: {
  data: DailyView
  busy: boolean
  save: Save
}) {
  const router = useRouter()
  const [support, setSupport] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [permission, setPermission] = useState("Not checked")
  const [endpoint, setEndpoint] = useState("")
  const [registered, setRegistered] = useState(false)
  const [message, setMessage] = useState("")
  const [working, setWorking] = useState(false)
  useEffect(() => {
    Promise.resolve()
      .then(async () => {
        setInstalled(window.matchMedia("(display-mode: standalone)").matches)
        setSupport(
          "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window &&
            window.isSecureContext,
        )
        if ("Notification" in window) setPermission(Notification.permission)
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          const sub = await reg?.pushManager?.getSubscription()
          setEndpoint(sub?.endpoint || "")
          if (sub) {
            const response = await fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "status",
                endpoint: sub.endpoint,
              }),
            })
            if (!response.ok)
              throw new Error("Could not check subscription status.")
            setRegistered(Boolean((await response.json()).registered))
          }
        }
      })
      .catch(() =>
        setMessage("Could not read notification status. Reload to try again."),
      )
  }, [])
  async function push(body: Record<string, unknown>) {
    const r = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await r.json()
    if (!r.ok) throw new Error(json.error || "Request failed.")
  }
  async function enable() {
    setWorking(true)
    setMessage("")
    try {
      // Must be the immediate result of this button action (especially on iOS).
      const allowed = await Notification.requestPermission()
      setPermission(allowed)
      if (allowed !== "granted")
        throw new Error(
          "Notifications are not allowed. You can change this in device settings; the checklist still works.",
        )
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      await navigator.serviceWorker.ready
      const key = Uint8Array.from(
        atob(data.push.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      )
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }))
      await push({ action: "subscribe", subscription: sub.toJSON() })
      setEndpoint(sub.endpoint)
      setRegistered(true)
      setMessage(
        "This device is connected. Enable the morning reminder above and send a test below.",
      )
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to enable notifications.",
      )
    } finally {
      setWorking(false)
    }
  }
  async function action(kind: "unsubscribe" | "test") {
    setWorking(true)
    setMessage("")
    try {
      await push({ action: kind, endpoint })
      if (kind === "unsubscribe") {
        const reg = await navigator.serviceWorker.getRegistration()
        await (await reg?.pushManager?.getSubscription())?.unsubscribe()
        setEndpoint("")
        setRegistered(false)
      }
      setMessage(
        kind === "test"
          ? "Push service accepted the test. Check your device to confirm delivery."
          : "This device is disconnected.",
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed.")
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Your day, your time</h2>
        <form
          key={`${data.settings.timeZone}-${data.settings.reminderTime}-${data.settings.remindersEnabled}`}
          className="mt-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            save({
              action: "settings",
              timeZone: f.get("timeZone"),
              reminderTime: f.get("reminderTime"),
              remindersEnabled: f.get("enabled") === "on",
            })
          }}
        >
          <Label name="Time zone">
            <input
              required
              name="timeZone"
              list="zones"
              defaultValue={data.settings.timeZone}
              className={field}
            />
            <datalist id="zones">
              {[
                "Asia/Kolkata",
                "Europe/Rome",
                "Europe/London",
                "America/New_York",
                "America/Los_Angeles",
                "Australia/Sydney",
                "UTC",
              ].map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </Label>
          <p className="text-xs leading-5 text-zinc-500">
            Use an IANA time zone. Existing history keeps its recorded dates;
            future days follow this setting.
          </p>
          <Label name="Morning reminder time">
            <input
              name="reminderTime"
              type="time"
              required
              defaultValue={data.settings.reminderTime}
              className={field}
            />
          </Label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 accent-emerald-800"
              type="checkbox"
              name="enabled"
              defaultChecked={data.settings.remindersEnabled}
            />
            Enable one daily reminder
          </label>
          <button className={primary} disabled={busy}>
            Save preferences
          </button>
        </form>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">On your iPhone</h2>
        <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-6 text-zinc-600">
          <li>Open your deployed HTTPS site in Safari (iOS 16.4 or later).</li>
          <li>Use Share → Add to Home Screen.</li>
          <li>Open Aditya | My personal Tracker from its Home Screen icon and sign in.</li>
          <li>
            Tap Enable notifications here and allow the permission prompt.
          </li>
          <li>
            Send a test, then configure the server scheduler for morning
            delivery.
          </li>
        </ol>
        <p className="mt-5 text-xs text-zinc-500">
          {installed
            ? "Running as an installed app."
            : "Currently in a browser tab."}{" "}
          Localhost on this computer is not accessible as localhost on your
          iPhone.
        </p>
      </section>
      <section className="space-y-4 rounded-2xl border bg-white p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold">Notification status</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            Browser:{" "}
            <strong>
              {support
                ? "Web Push supported"
                : "Unavailable — checklist still works"}
            </strong>
          </p>
          <p>
            Permission: <strong>{permission}</strong>
          </p>
          <p>
            Push keys:{" "}
            <strong>
              {data.push.configured ? "Configured" : "Not configured"}
            </strong>
          </p>
          <p>
            This device:{" "}
            <strong>
              {endpoint
                ? registered
                  ? "Connected to this account"
                  : "Reconnect to sync with the server"
                : "Not connected"}
            </strong>
          </p>
          <p>
            Scheduler secret:{" "}
            <strong>
              {data.push.schedulerConfigured ? "Configured" : "Not configured"}
            </strong>
          </p>
          <p>
            Last scheduler contact:{" "}
            <strong>{data.push.schedulerLastSeen || "Not verified"}</strong>
          </p>
        </div>
        <p className="text-sm leading-6 text-zinc-500">
          A server scheduler must call the protected morning endpoint every five
          minutes. An open tab is not required. Push keys alone do not mean
          morning delivery is running.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className={primary}
            disabled={!support || !data.push.configured || working || busy}
            onClick={enable}
          >
            {endpoint ? "Reconnect notifications" : "Enable notifications"}
          </button>
          <button
            className={button}
            disabled={!endpoint || !registered || working || busy}
            onClick={() => action("test")}
          >
            Send test notification
          </button>
          <button
            className={button}
            disabled={!endpoint || working || busy}
            onClick={() => action("unsubscribe")}
          >
            Disconnect this device
          </button>
        </div>
        <p role="status" className="text-sm text-emerald-800">
          {working ? "Working…" : message}
        </p>
        {data.push.deliveries.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm">
              Recent delivery attempts
            </summary>
            <ul className="mt-3 space-y-2 text-xs text-zinc-500">
              {data.push.deliveries.map((d, i) => (
                <li key={i}>
                  {d.date} · {d.state}
                  {d.detail ? ` · ${d.detail}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="text-xs leading-5 text-zinc-500">
          Private checklist contents are not cached offline. Notifications show
          only a task count.
        </p>
        <button
          className={button}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" })
            router.replace("/login")
          }}
        >
          Log out
        </button>
      </section>
    </div>
  )
}
