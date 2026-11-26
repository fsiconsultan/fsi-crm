export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-negative">
      {message}
    </p>
  )
}
