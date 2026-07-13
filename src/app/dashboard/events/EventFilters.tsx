"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { Select } from "@/components/ui/Select"
import { Card, CardContent } from "@/components/ui/Card"
import { FilterBar } from "@/components/layout/FilterBar"

interface EventFiltersProps {
  typeFilter: string
  search: string
  typeOptions: { value: string; label: string }[]
}

export function EventFilters({ typeFilter, search, typeOptions }: EventFiltersProps) {
  const router = useRouter()

  function buildSearchUrl(q: string) {
    const params = new URLSearchParams()
    params.set("page", "1")
    if (typeFilter) params.set("type", typeFilter)
    if (q) params.set("q", q)
    return `/dashboard/events?${params.toString()}`
  }

  function buildTypeFilterUrl(type: string) {
    const params = new URLSearchParams()
    params.set("page", "1")
    if (type) params.set("type", type)
    if (search) params.set("q", search)
    return `/dashboard/events?${params.toString()}`
  }

  return (
    <Card className="mb-5">
      <CardContent className="py-3 px-5">
        <FilterBar>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-full sm:w-auto">
              <Select
                id="event-type-filter"
                options={typeOptions}
                value={typeFilter}
                onChange={(e) => {
                  router.push(buildTypeFilterUrl(e.target.value))
                }}
              />
            </div>

            <form
              method="GET"
              action="/dashboard/events"
              className="flex items-center gap-1.5 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:flex-initial">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Client ID, type..."
                  className="w-full sm:w-48 text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] pl-7 pr-2.5 py-1.5"
                  aria-label="Search events"
                />
              </div>
              <button
                type="submit"
                className="text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] px-2.5 py-1.5 hover:bg-[var(--surface-overlay)] shrink-0"
                aria-label="Apply search"
              >
                <Search size={13} />
              </button>
              {search && (
                <a
                  href={buildSearchUrl("")}
                  className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                  aria-label="Clear search"
                >
                  <X size={12} /> Clear
                </a>
              )}
            </form>
          </div>
        </FilterBar>
      </CardContent>
    </Card>
  )
}
