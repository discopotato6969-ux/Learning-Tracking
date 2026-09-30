"use client"

import {
  BarChart3,
  BookOpen,
  Bookmark,
  CirclePlay,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { cn } from "@/lib/utils"

const primaryNavigation = [
  { label: "Today", href: "/today", icon: LayoutDashboard },
  { label: "Tasks & routines", href: "/tasks", icon: BookOpen },
  { label: "Study plan", href: "/study", icon: Bookmark },
  { label: "Consistency", href: "/insights", icon: BarChart3 },
  { label: "Reminders", href: "/settings", icon: CirclePlay },
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My Courses", href: "/courses", icon: BookOpen },
  { label: "Continue Watching", href: "/#continue-watching", icon: CirclePlay },
  { label: "Favorites", href: "/favorites", icon: Bookmark },
]

const categories = [
  "After Effects",
  "Illustrator",
  "Drawing",
  "Brushes",
  "Colour Theory",
  "Python Course",
  "Nuke",
  "Blender",
  "Houdini",
  "Maya",
  "Cinema 4D",
  "Animation",
]

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href)
}

function SidebarContent({ pathname, onLogout }: { pathname: string; onLogout: () => void }) {
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link
        href="/"
        className="flex items-center gap-3 px-3 text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image src="/icon-192.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg object-cover" unoptimized />
        <span className="text-sm leading-5">Aditya | My personal Tracker</span>
      </Link>

      <div className="mt-10 flex-1">
        <nav className="space-y-1" aria-label="Primary navigation">
          {primaryNavigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActivePath(pathname, href)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-9">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Categories
          </p>
          <nav className="mt-3 space-y-1" aria-label="Course categories">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/courses?category=${category.toLowerCase().replace(" ", "-")}`}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {category}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="space-y-1 border-t pt-4">
        <Link
          href="/progress"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActivePath(pathname, "/progress")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <BarChart3 className="size-4" aria-hidden="true" />
          Progress
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  )
}

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r bg-background md:block">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-black/20"
          />
          <aside className="relative h-full w-[min(18rem,85vw)] border-r bg-background shadow-xl">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent pathname={pathname} onLogout={handleLogout} />
          </aside>
        </div>
      )}
    </>
  )
}
