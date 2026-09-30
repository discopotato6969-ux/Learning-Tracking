import { Filter } from "lucide-react"

import AppSidebar from "@/components/dashboard/app-sidebar"
import CourseGrid from "@/components/dashboard/course-grid"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import { courses, mainCategories } from "@/data/courses"
import { applyProgress, readProgressStore } from "@/lib/progress-store"

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string | string[] }>
}) {
  const resolvedSearchParams = await searchParams
  const store = await readProgressStore()
  const userCourses = courses.map((course) => applyProgress(course, store))
  const categoryParam = resolvedSearchParams?.category
  const category = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam
  const filteredCourses = category
    ? userCourses.filter((course) => course.category.toLowerCase().replaceAll(" ", "-") === category)
    : userCourses
  const activeCategory = mainCategories.find((item) => item.toLowerCase().replaceAll(" ", "-") === category)

  return (
    <div className="min-h-screen bg-muted/30">
      <AppSidebar />
      <main className="min-h-screen md:pl-64">
        <DashboardHeader />
        <div className="mx-auto max-w-7xl space-y-8 p-5 pt-20 sm:p-8 sm:pt-10 lg:p-12">
          <section>
            <p className="text-sm font-medium text-muted-foreground">Your personal library</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My courses</h1>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground"><Filter className="size-4" aria-hidden="true" />{activeCategory ?? "All categories"}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Browse everything in your Aditya | My personal Tracker collection.</p>
          </section>
          {filteredCourses.length > 0 ? <CourseGrid courses={filteredCourses} /> : <div className="rounded-xl border border-dashed bg-background p-10 text-center"><h2 className="font-semibold">No courses in this category yet</h2><p className="mt-2 text-sm text-muted-foreground">Try another category or browse your full library.</p></div>}
        </div>
      </main>
    </div>
  )
}
