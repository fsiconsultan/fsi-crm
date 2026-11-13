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

// Initials stay 12px on list avatars; the large photo in the Change photo dialog needs bigger ones.
const initialsSize = { small: "text-xs", large: "text-2xl" } as const

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
  // Only a web address or a site path is handed to the image loader; anything
  // else stored in the column falls back to initials.
  if (photoUrl && /^(https?:\/\/|\/)/.test(photoUrl)) {
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
        "flex shrink-0 items-center justify-center rounded-full bg-surface-sunken font-medium text-ink ring-1 ring-line",
        initialsSize[size >= 64 ? "large" : "small"],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
