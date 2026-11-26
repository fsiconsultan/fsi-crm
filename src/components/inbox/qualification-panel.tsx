import { cleanAnswers, QUALIFICATION_FIELDS, type QualificationAnswers } from "@/lib/ai/qualification"
import type { Qualification } from "@/lib/whatsapp/types"

type Field = (typeof QUALIFICATION_FIELDS)[number]

function Answers({ saved, answers }: { saved: Field[]; answers: QualificationAnswers }) {
  if (saved.length === 0) return <p className="text-sm text-muted">No qualification answers saved yet.</p>
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {saved.map((field) => (
        <div key={field.key} className="min-w-0">
          <dt className="text-xs text-muted">{field.label}</dt>
          <dd className="break-words text-sm text-ink">{answers[field.key]}</dd>
        </div>
      ))}
    </dl>
  )
}

export function QualificationPanel({ qualification }: { qualification: Qualification | null }) {
  const answers = cleanAnswers(qualification?.answers)
  const saved = QUALIFICATION_FIELDS.filter((field) => answers[field.key])

  return (
    <section>
      <h3 className="mb-2 text-[13px] font-medium text-ink">
        Qualification answers ({saved.length} of {QUALIFICATION_FIELDS.length})
      </h3>
      <Answers saved={saved} answers={answers} />
    </section>
  )
}
