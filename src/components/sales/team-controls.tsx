"use client"

import { ArrowDownUp, BadgeCheck, CalendarDays } from "lucide-react"
import { PillMenu } from "@/components/dashboard/dashboard-filters"
import { SALES_ROLES } from "./roles"
import { TEAM_PERIODS, TEAM_PERIOD_KEYS, TEAM_SORTS, TEAM_SORT_KEYS, teamHref, type TeamParams } from "./team-model"

// Client side because the pills take icon components. The period pill in the page header: the same menu-of-links pill the
// Overview and Leads use, so the URL holds the choice. `path` lets a person's
// page reuse it.
export function PeriodPill({ params, range, path = "/sales" }: { params: TeamParams; range: string; path?: string }) {
  return (
    <PillMenu
      menuLabel="Period"
      icon={CalendarDays}
      text={range}
      hint=", change the period for deals and new leads"
      options={TEAM_PERIOD_KEYS.map((key) => ({
        label: TEAM_PERIODS[key],
        href: teamHref({ ...params, period: key }, path),
        checked: key === params.period,
      }))}
    />
  )
}

// A calendar for the period, up and down arrows for the order, a badge for the role.
export function TeamListControls({ params }: { params: TeamParams }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillMenu
        menuLabel="Role"
        icon={BadgeCheck}
        text={params.role || "All roles"}
        hint=", show one role only"
        options={[
          { label: "All roles", href: teamHref({ ...params, role: "" }), checked: params.role === "" },
          ...SALES_ROLES.map((role) => ({
            label: role,
            href: teamHref({ ...params, role }),
            checked: params.role === role,
          })),
        ]}
      />
      <PillMenu
        menuLabel="Sort"
        icon={ArrowDownUp}
        text={TEAM_SORTS[params.sort]}
        hint=", change the order"
        options={TEAM_SORT_KEYS.map((sort) => ({
          label: TEAM_SORTS[sort],
          href: teamHref({ ...params, sort }),
          checked: sort === params.sort,
        }))}
      />
    </div>
  )
}
