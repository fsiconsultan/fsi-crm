import type { TextareaHTMLAttributes } from "react"

// The reply textarea, shared by the live box and its disabled explanations.
// 16px on phones: iOS zooms the page when a focused field is smaller.
export function ReplyField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      name="body"
      rows={2}
      maxLength={4096}
      className="min-h-11 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-sunken md:text-sm"
      {...props}
    />
  )
}
