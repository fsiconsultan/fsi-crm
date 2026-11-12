import Image from "next/image"
import { cn } from "@/lib/cn"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

// A person's uploaded photo, or their initials when they have none. Never a
// generated face (antislop R-23).
export function Avatar({
  name,
  photoUrl,
  size = 40,
  className,
}: {
  name: string
  photoUrl: string | null
  size?: number
  className?: string
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-ink ring-1 ring-line",
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
