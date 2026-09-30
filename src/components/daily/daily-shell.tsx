import Link from "next/link"
import Image from "next/image"
import {
  CalendarDays,
  ListChecks,
  BookOpen,
  ChartNoAxesCombined,
  Bell,
  Library,
} from "lucide-react"
import type { ReactNode } from "react"

const navigation = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/tasks", label: "Routines", icon: ListChecks },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/insights", label: "Trends", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Bell },
]
export default function DailyShell({
  children,
  current,
}: {
  children: ReactNode
  current: string
}) {
  return (
    <div className="min-h-dvh bg-[#f6f7f4] text-zinc-900">
      <header className="border-b border-black/5 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/today"
            className="flex min-w-0 items-center gap-3 font-semibold tracking-tight"
          >
            <Image src="/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl object-cover" unoptimized />
            <span className="max-w-56 text-sm leading-5 sm:max-w-none sm:text-base">Aditya | My personal Tracker</span>
          </Link>
          <Link
            href="/courses"
            className="flex min-h-11 shrink-0 items-center gap-2 text-sm text-zinc-600"
          >
            <Library size={17} />
            <span className="hidden sm:inline">Course library</span><span className="sr-only sm:hidden">Course library</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <nav
          aria-label="Daily tracking"
          className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-white pb-[env(safe-area-inset-bottom)] md:static md:justify-start md:gap-6 md:border-t-0 md:border-b md:bg-transparent md:py-3"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={current === href ? "page" : undefined}
              className={`flex min-h-16 min-w-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-sm ${current === href ? "text-emerald-800 md:bg-emerald-900/5" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <main className="pb-32 pt-8 md:pb-14 md:pt-10">{children}</main>
      </div>
    </div>
  )
}
