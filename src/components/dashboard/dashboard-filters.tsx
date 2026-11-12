"use client"

import Form from "next/form"
import { controlClass } from "@/components/ui/field"

type Option = { value: string; label: string }

// Changing either select reloads the Overview for that range and person.
export function DashboardFilters({
  period,
  periods,
  sales,
  salesOptions,
}: {
  period: string
  periods: Option[]
  sales: string
  /** Admin only: the salesperson select. Null for everyone else. */
  salesOptions: Option[] | null
}) {
  const control = `${controlClass} max-w-full pr-8`

  return (
    <Form action="/" className="flex flex-wrap items-center gap-2">
      <label htmlFor="period" className="sr-only">
        Date range
      </label>
      <select
        id="period"
        name="period"
        defaultValue={period}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={control}
      >
        {periods.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {salesOptions ? (
        <>
          <label htmlFor="sales" className="sr-only">
            Salesperson
          </label>
          <select
            id="sales"
            name="sales"
            defaultValue={sales}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className={control}
          >
            <option value="">Whole team</option>
            {salesOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </Form>
  )
}
